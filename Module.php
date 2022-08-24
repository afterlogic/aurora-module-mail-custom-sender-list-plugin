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
 * @copyright Copyright (c) 2022, Afterlogic Corp.
 *
 * @package Modules
 */
class Module extends \Aurora\System\Module\AbstractModule
{
	protected $aRequireModules = ['Mail'];

	protected $aExcludedFolderTypes = [
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
					!in_array($oFolder->getType(), $this->aExcludedFolderTypes)) {
					$aFolders[] = $oFolder->getRawFullName();
				}
			}
		});
		return $aFolders;
	}
}
