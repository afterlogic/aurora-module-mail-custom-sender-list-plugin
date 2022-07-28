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

	public function GetSenders($AccountID, $Folders = [], $Period = '')
	{
		Api::checkUserRoleIsAtLeast(UserRole::NormalUser);

		$oAccount = MailModule::getInstance()->getAccountsManager()->getAccountById($AccountID);

		MailModule::checkAccess($oAccount);

		$sSearch = '';
		if (!empty($Period)) {
			$date = new DateTime('now');
			$toDate = $date->format('Y.m.d');
			$date->modify('- ' . $Period);
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
