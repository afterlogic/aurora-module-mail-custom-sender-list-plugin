<?php
/**
 * This code is licensed under AGPLv3 license or Afterlogic Software License
 * if commercial version of the product was purchased.
 * For full statements of the licenses see LICENSE-AFTERLOGIC and LICENSE-AGPL3 files.
 */

namespace Aurora\Modules\MailCustomSenderListPlugin;

use Aurora\Modules\Mail\Module as MailModule;
use Aurora\System\Api;
use Aurora\System\Enums\UserRole;
use Aurora\Modules\Mail\Enums\FolderType;
use DateTime;

/**
 * @license https://www.gnu.org/licenses/agpl-3.0.html AGPL-3.0
 * @license https://afterlogic.com/products/common-licensing Afterlogic Software License
 * @copyright Copyright (c) 2021, Afterlogic Corp.
 *
 * @package Modules
 */
class Module extends \Aurora\System\Module\AbstractModule
{
	protected $aRequireModules = ['Mail'];

	protected $aExtendedFolderTypes = [
		FolderType::Sent,
		FolderType::Drafts,
		FolderType::Spam,
		FolderType::Trash,	
	];

	/**
	 * Initializes MailCustomSenderListPlugin Module.
	 *
	 * @ignore
	 */
	public function init()
	{
	}

	/**
	 * @return Module
	 */
	public static function Decorator()
	{
		return parent::Decorator();
	}

	public function GetSavedSenders()
	{
		return [
			'nadinshi@gmail.com' => 7,
			'notifications@github.com' => 23,
			'notifications@tasks.clickup.com' => 139,
		];
	}

	public function GetSenders($AccountID, $Folders = [])
	{
		Api::checkUserRoleIsAtLeast(UserRole::NormalUser);

		$oAccount = MailModule::getInstance()->getAccountsManager()->getAccountById($AccountID);

		MailModule::checkAccess($oAccount);

		$date = new DateTime('now');
		$toDate = $date->format('Y.m.d');
		$date->sub(new \DateInterval('P30D'));
		$fromDate = $date->format('Y.m.d');

		$senders = [];
		
		$aFolders = $Folders;
		if (count($aFolders) === 0) {
			$aFolders = $this->getFolders($oAccount);
		}
		foreach ($aFolders as $folderName) {
			$messageColl = MailModule::getInstance()->getMailManager()->getMessageList(
				$oAccount, 
				$folderName, 
				0, 
				999,
				'date:'. $fromDate . '/' . $toDate
			);
			$messageColl->ForeachList(
				function ($message) use (&$senders) {
					$fromColl = $message->getFrom();
					if ($fromColl && 0 < $fromColl->Count()) {
						$from =& $fromColl->GetByIndex(0);
						if ($from) {
							$fromEmail = trim($from->GetEmail());
							if (!isset($senders[$fromEmail])) {
								$senders[$fromEmail] = 1;
							} else {
								$senders[$fromEmail]++;
							}
						}
					}
				}
			);
		}

		if (count($senders) > 1) {
			$senders = collect($senders)->sort()->reverse()->slice(0, 3)->toArray();
		}

		return $senders;
	}

	public function GetMessages($AccountID, $Sender, $Folders = [], $Offset = 0, $Limit = 20, $Search = '', $Filters = '', $UseThreading = false, $InboxUidnext = '', $SortBy = null, $SortOrder =  \Aurora\System\Enums\SortOrder::DESC)
	{
		Api::checkUserRoleIsAtLeast(UserRole::NormalUser);

		$sSearch = \trim((string) $Search);

		$sSender = \trim((string) $Sender);
		if (!empty($sSender)) {
			$sSearch = $sSearch . ' from:' . $sSender;
		}

		$aFilters = [];
		$sFilters = \strtolower(\trim((string) $Filters));
		if (0 < \strlen($sFilters)) {
			$aFilters = \array_filter(\explode(',', $sFilters), function ($sValue) {
				return '' !== trim($sValue);
			});
		}

		$iOffset = (int) $Offset;
		$iLimit = (int) $Limit;

		if (0 > $iOffset || 0 >= $iLimit || 200 < $iLimit) {
			throw new \Aurora\System\Exceptions\ApiException(\Aurora\System\Notifications::InvalidInputParameter);
		}

		$oAccount = MailModule::getInstance()->getAccountsManager()->getAccountById($AccountID);

		MailModule::checkAccess($oAccount);


		$aSortInfo = MailModule::getInstance()->getSortInfo($SortBy, $SortOrder);

		$sSortBy = \strtoupper($aSortInfo[0]);
		$sSortOrder = $aSortInfo[1] === \Aurora\System\Enums\SortOrder::DESC ? 'REVERSE' : '';

		$oMessageCollectionResult = \Aurora\Modules\Mail\Classes\MessageCollection::createInstance();
		$oMessageCollectionResult->Limit = $iLimit;
		$oMessageCollectionResult->Offset = $iOffset;
		$oMessageCollectionResult->Search = $Search;
		$oMessageCollectionResult->Filters = implode(',', $aFilters);

		$aFolderUids = [];
		$aUids = [];
		$iMessagesCount = 0;
		$iMessagesResultCount = 0;
		$iMessagesUnseenCount = 0;
		$aFoldersHash = [];

		$sSortBy = 'ARRIVAL';
		$sSortOrder = $SortOrder === \Aurora\System\Enums\SortOrder::DESC ? 'REVERSE' : '';

		$aFolders = $Folders;
		if (count($aFolders) === 0) {
			$aFolders = $this->getFolders($oAccount);
		}
		foreach ($aFolders as $sFolder) {
			$aUnifiedInfo = MailModule::getInstance()->getMailManager()->getUnifiedMailboxMessagesInfo($oAccount, $sFolder, $sSearch, $aFilters, $UseThreading, $iOffset + $iLimit, $sSortBy, $sSortOrder);
			if (is_array($aUnifiedInfo['Uids']) && count($aUnifiedInfo['Uids']) > 0) {
				foreach($aUnifiedInfo['Uids'] as $iKey => $aUid) {
					$aUnifiedInfo['Uids'][$iKey]['folder'] = $sFolder;
				}
				$aUids = array_merge(
					$aUids,
					$aUnifiedInfo['Uids']
				);
			}
			$iMessagesCount += $aUnifiedInfo['Count'];
			$iMessagesResultCount += $aUnifiedInfo['ResultCount'];
			$iMessagesUnseenCount += $aUnifiedInfo['UnreadCount'];
			$aFoldersHash[] = $sFolder . ':' . $aUnifiedInfo['FolderHash'];
		}

		// sort by time
		usort($aUids, function($a, $b) use ($SortOrder) {
			if ($SortOrder === \Aurora\System\Enums\SortOrder::DESC) {
				return (strtotime($a['internaldate']) < strtotime($b['internaldate'])) ? 1 : -1;
			} else {
				return (strtotime($a['internaldate']) > strtotime($b['internaldate'])) ? 1 : -1;
			}
		});
		if (count($aUids) >= 0) {
			$aUids = array_slice($aUids, $iOffset, $iLimit);
		}

		$aAllMessages = [];
		$aNextUids = [];
		$aFoldersHash = [];

		$aInboxUidsNext = [];
		if (!empty($InboxUidnext)) {
			$aInboxUids = \explode('.', $InboxUidnext);
			foreach ($aInboxUids as $aUid) {
				$aUidsNext = \explode(':', $aUid);
				if (count($aUidsNext) === 2) {
					$aInboxUidsNext[$aUidsNext[0]] = $aUidsNext[1];
				}
			}
		}

		foreach ($aUids as $aUid) {
			$aFolderUids[$aUid['folder']][] = $aUid['uid'];
		}
		foreach ($aFolderUids as $sFolder => $aFldUids) {
			$sFolder = (string) $sFolder;
			$sInboxUidnext = isset($aInboxUidsNext[$sFolder]) ? $aInboxUidsNext[$sFolder] : '';

			$oMessageCollection = MailModule::getInstance()->getMailManager()->getMessageListByUids(
				$oAccount, $sFolder, $aFldUids, $sInboxUidnext
			);

			if ($UseThreading) {
				$oMessageCollection->ForeachList(function (/* @var $oMessage \Aurora\Modules\Mail\Classes\Message */ $oMessage) use ($aUids, $sFolder) {
					$iUid = $oMessage->getUid();
					$aUidInfo = current(array_filter($aUids, function ($aUid) use ($sFolder, $iUid) {
						return $aUid['folder'] === $sFolder && $aUid['uid'] == $iUid;
					}));
					if (isset($aUidInfo['threads']) && is_array($aUidInfo['threads'])) {
						$oMessage->setThreads($aUidInfo['threads']);
					}
				});
			}

			foreach ($oMessageCollection->New as $aNew) {
				$aNew['Folder'] = $sFolder;
				$oMessageCollectionResult->New[] = $aNew;
			}

			$aNextUids[] = $sFolder . ':' . $oMessageCollection->UidNext;
			$aMessages = $oMessageCollection->GetAsArray();
			foreach ($aMessages as $oMessage) {
				$oMessage->setAccountId($oAccount->Id);
				$oMessage->setUnifiedUid($oAccount->Id . ':' . $sFolder . ':' . $oMessage->getUid());
			}
			$aAllMessages = array_merge($aAllMessages, $aMessages);
		}

		// sort by time
		usort($aAllMessages, function($a, $b) use ($SortOrder) {
			if ($SortOrder === \Aurora\System\Enums\SortOrder::DESC) {
				return ($a->getReceivedOrDateTimeStamp() < $b->getReceivedOrDateTimeStamp()) ? 1 : -1;
			} else {
				return ($a->getReceivedOrDateTimeStamp() > $b->getReceivedOrDateTimeStamp()) ? 1 : -1;
			}
		});

		$oMessageCollectionResult->Uids = array_map(function ($oMessage) {
			return $oMessage->getUnifiedUid();
		}, $aAllMessages);

		$oMessageCollectionResult->MessageCount = $iMessagesCount;
		$oMessageCollectionResult->MessageResultCount = $iMessagesResultCount;
		$oMessageCollectionResult->MessageUnseenCount = $iMessagesUnseenCount;
		$oMessageCollectionResult->UidNext = implode('.', $aNextUids);
		$oMessageCollectionResult->FolderHash = implode('.', $aFoldersHash);
		$oMessageCollectionResult->AddArray($aAllMessages);

		return $oMessageCollectionResult;
	}

	protected function getFolders($oAccount)
	{
		$aFolders = [];

		$folderColl = MailModule::getInstance()->getMailManager()->getFolders($oAccount);
			
		$folderColl->foreachWithSubFolders(function ($oFolder) use (&$aFolders) {
			if ($oFolder->isSubscribed() && $oFolder->isSelectable()) {
				if ($oFolder->getFolderXListType() !== FolderType::All &&
					!in_array($oFolder->getType(), $this->aExtendedFolderTypes)) {
					$aFolders[] = $oFolder->getRawFullName();
				}
			}
		});
		return $aFolders;
	}
}
