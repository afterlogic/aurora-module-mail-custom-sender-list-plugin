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
use Aurora\Modules\Mail\Enums\SearchInFoldersType;
use DateTime;

/**
 * @license https://www.gnu.org/licenses/agpl-3.0.html AGPL-3.0
 * @license https://afterlogic.com/products/common-licensing Afterlogic Software License
 * @copyright Copyright (c) 2022, Afterlogic Corp.
 *
 * @package Modules
 */
class Module extends \Aurora\System\Module\AbstractModule
{
	protected $aRequireModules = ['Mail'];

	protected $aSystemFoldersToExclude = [];

	/**
	 * Initializes MailCustomSenderListPlugin Module.
	 *
	 * @ignore
	 */
	public function init()
	{
		$this->aSystemFoldersToExclude = $this->getConfig('SystemFoldersToExclude', []);
	}

	/**
	 * @return Module
	 */
	public static function Decorator()
	{
		return parent::Decorator();
	}

	public function GetSettings()
	{
		\Aurora\System\Api::checkUserRoleIsAtLeast(\Aurora\System\Enums\UserRole::NormalUser);

		$user = Api::getAuthenticatedUser();
		if ($user) {
			return [
				'SenderFolderMinMessagesCount' => $this->getConfig('SenderFolderMinMessagesCount', 2),
				'NumberOfSendersToDisplay' => $user->getExtendedProp(self::GetName() . '::NumberOfSendersToDisplay', 3),
				'SearchPeriod' => $user->getExtendedProp(self::GetName() . '::SearchPeriod', '1 month'),
				'SearchFolders' => $user->getExtendedProp(self::GetName() . '::SearchFolders', 'inbox'),
			];
		}

		return [];
	}

	public function UpdateSettings($NumberOfSendersToDisplay, $SearchPeriod, $SearchFolders)
	{
		\Aurora\System\Api::checkUserRoleIsAtLeast(\Aurora\System\Enums\UserRole::NormalUser);

		$user = Api::getAuthenticatedUser();
		if ($user) {
			$user->setExtendedProp(self::GetName() . '::NumberOfSendersToDisplay', $NumberOfSendersToDisplay);
			$user->setExtendedProp(self::GetName() . '::SearchPeriod', $SearchPeriod);
			$user->setExtendedProp(self::GetName() . '::SearchFolders', $SearchFolders);
			return $user->save();
		}

		return false;
	}

	public function GetSenders($AccountID, $Folders = [], $Period = '')
	{
		Api::checkUserRoleIsAtLeast(UserRole::NormalUser);

		$oAccount = MailModule::getInstance()->getAccountsManager()->getAccountById($AccountID);

		MailModule::checkAccess($oAccount);

		$sSearch = '';
		if (!empty($Period)) {
			$date = new DateTime('now');
			$toDate = $date->format('Y.m.d');
			$date->modify('-' . $Period);
			$fromDate = $date->format('Y.m.d');

			$sSearch = 'date:'. $fromDate . '/' . $toDate;
		}

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
				$sSearch
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
			$senders = collect($senders)->sort()->reverse()->toArray();
		}

		return $senders;
	}

	protected function getFolders($oAccount)
	{
		$aFolders = [];

		$folderColl = MailModule::getInstance()->getMailManager()->getFolders($oAccount);
			
		$folderColl->foreachWithSubFolders(function ($oFolder) use (&$aFolders) {
			if ($oFolder->isSubscribed() && $oFolder->isSelectable()) {
				if ($oFolder->getFolderXListType() !== FolderType::All &&
					!in_array($oFolder->getType(), $this->aSystemFoldersToExclude)) {
					$aFolders[] = $oFolder->getRawFullName();
				}
			}
		});
		return $aFolders;
	}

	protected function getSearchFoldersString()
	{
		$user = Api::getAuthenticatedUser();
		if ($user) {
			$sSearchFolders = $user->getExtendedProp(self::GetName() . '::SearchFolders', 'inbox');
			switch ($sSearchFolders) {
				case 'inbox':
					return '';
				case 'inbox+subfolders':
					return ' folders:sub';
				default:
					return ' folders:all';
			}
		} else {
			return '';
		}
	}

	public function GetMessages($AccountID, $Senders, $Period = '', $Folder = 'INBOX', $Offset = 0, $Limit = 20, $Search = '', $Filters = '', $UseThreading = false, $InboxUidnext = '', $SortBy = null, $SortOrder = null)
	{
		Api::checkUserRoleIsAtLeast(UserRole::NormalUser);

		$sSearch = \trim((string) $Search);
		if (is_array($Senders) && count($Senders) > 0) {
			$Search = \trim($Search . ' from:' . implode(',', $Senders)) . $this->getSearchFoldersString();
		}

		$aFilters = [];
		$sFilters = \strtolower(\trim((string) $Filters));
		if (0 < \strlen($sFilters)) {
			$aFilters = \array_filter(\explode(',', $sFilters), function ($sValue) {
				return '' !== trim($sValue);
			});
		}

		if (!empty($Period)) {
			$date = new DateTime('now');
			$toDate = $date->format('Y.m.d');
			$date->modify('-' . $Period);
			$fromDate = $date->format('Y.m.d');

			$Search = $Search . ' date:'. $fromDate . '/' . $toDate;
		}

		$iOffset = (int) $Offset;
		$iLimit = (int) $Limit;

		if (0 > $iOffset || 0 >= $iLimit || 200 < $iLimit) {
			throw new \Aurora\System\Exceptions\ApiException(\Aurora\System\Notifications::InvalidInputParameter);
		}

		$MailModule = MailModule::getInstance();
		$oAccount = $MailModule->getAccountsManager()->getAccountById($AccountID);

		self::checkAccess($oAccount);

		$aSortInfo = $MailModule->getSortInfo($SortBy, $SortOrder);

		$sSortBy = \strtoupper($aSortInfo[0]);
		$sSortOrder = $aSortInfo[1] === \Aurora\System\Enums\SortOrder::DESC ? 'REVERSE' : '';

		$oMessageCollectionResult = \Aurora\Modules\Mail\Classes\MessageCollection::createInstance();
		$oMessageCollectionResult->FolderName = $Folder;
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

		$aFolderObjects = \Closure::bind(
			function ($oMailModule) use ($oAccount, $Folder, $Search, &$sSearch) { 
				return $oMailModule->getFoldersForSearch($oAccount, $Folder, $Search, $sSearch);
			}, null, MailModule::class
		)($MailModule);

		$aFolders = [];
		foreach ($aFolderObjects as $oFolder) {
			if (!in_array($oFolder->getType(), $this->aSystemFoldersToExclude)) {
				$aFolders[] = $oFolder->getRawFullName();
			}
		}

		foreach ($aFolders as $sFolder) {
			$aUnifiedInfo = $MailModule->getMailManager()->getUnifiedMailboxMessagesInfo(
				$oAccount, 
				$sFolder, 
				$sSearch, 
				$aFilters, 
				$UseThreading, 
				$iOffset + $iLimit, 
				$sSortBy, 
				$sSortOrder
			);
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

			$oMessageCollection = $MailModule->getMailManager()->getMessageListByUids(
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
}
