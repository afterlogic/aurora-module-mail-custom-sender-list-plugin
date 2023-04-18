<?php
/**
 * This code is licensed under AGPLv3 license or Afterlogic Software License
 * if commercial version of the product was purchased.
 * For full statements of the licenses see LICENSE-AFTERLOGIC and LICENSE-AGPL3 files.
 */

namespace Aurora\Modules\MailCustomSenderListPlugin;

use Aurora\System\SettingsProperty;

/**
 * @property bool $Disabled
 * @property int $SenderFolderMinMessagesCount
 * @property array $SystemFoldersToExclude
 */

class Settings extends \Aurora\System\Module\Settings
{
    protected function initDefaults()
    {
        $this->aContainer = [
            "Disabled" => new SettingsProperty(
                false,
                "bool",
                null,
                "Setting to true disables the module",
            ),
            "SenderFolderMinMessagesCount" => new SettingsProperty(
                2,
                "int",
                null,
                "If sender has sent less messages than this number their messages will appear in the 'Rest mail' virtual folder",
            ),
            "SystemFoldersToExclude" => new SettingsProperty(
                [],
                "array",
                null,
                "List of folder types to exclude. Possible values: 1 - Inbox, 2 - Sent, 3 - Drafts, 4 - Spam, 5 - Trash, 6 - Virus, 11 - All mail",
            ),
        ];
    }
}
