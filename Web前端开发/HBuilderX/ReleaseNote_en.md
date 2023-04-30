# HBuilder X - Release Notes
======================================
## 3.5.3.20220729
* Added HBuilderX status bar Upgrade added red dot prompt
* Added MarkDown code block to support language coloring and highlighting, you need to download and add the corresponding language coloring extension plug-in
* Added Markdown support to go to `#title` or `@`alias of title across files
* Added TypeScript support for syntax verification
* Added language service to support tailwindcss, need to install tailwindcss plugin [Details](https://ext.dcloud.net.cn/plugin?id=8560)
* Fixed language service React, add `()` bug after `<App />` carriage return
* Fixed language service React jsx file no code hint bug
* Fixed language service CSS pointer-events missing auto attribute bug
* Fixed the bug of code block settings, custom other language code blocks, two JSON options appear in the window list
* Fixed the bug that the `$DATE_TIME` in the comment of the custom code block displays the wrong date
* Fixed the operating system environment variable, configuring `NODE_OPTIONS --openssl-legacy-provider`, HBuilderX loses response when it starts
* Fixed the bug that the plugin API `hx.window.showQuickPick()` window could not scroll after opening the terminal
* Fixed the bug that the cursor position is wrong after opening the document for the first time and editing it for the first time
* Fixed the bug that the editor selects the language association window position offset
* Fixed the bug of plugin installation try move failed in some cases
* Git plugin, pull operation, the default option is changed to the fourth item, namely `git pull --rebase --autostash`
* Fixed some issues for language service

## 3.4.18.20220630
* Fixed the bug that json file search index symbol causes crash.
* Fixed the bug that the closed tag does not have a dotted box after the html tag is selected.
* Fixed the bug that the hover list disappears automatically when Windows opens the terminal, searches for categories in the toolbar, and moves the mouse to it.

## 3.4.15.20220610
* Fixed PHP files, comment shortcuts, comment bugs

## 3.4.14.20220607
* Added HBuilderX Support for custom project Snippets
* Added support for running and debugging Node programs
* Some of the built-in language syntax highlighting was migrated to the plug-in marketplace
* Added syntax highlighting that can be independently extended for new languages, and language highlighting plug-ins can be developed or downloaded
* Added language service, JavaScript supports DOM type recognition of id selectors in Document. getElementById and Document. querySelector
* Added language service, SCSS support for prompt `!global` and `!default`
* Added language service, VUE-CLI projects, code hints support element-UI, bootstrap-vue, etc
* Fixed language service, input CSS code in the same line, press Enter, replace the wrong position Bug
* Fixed language service, jsdoc carriage return error Bug
* Fixed Emmet syntax bug where pressing TAB did not respond correctly
* Fixed multi-file search, the right side of the display code coloring error Bug
* Fixed plug-in installation window, installed plug-in, version number display error Bug

## 3.4.7.20220422
* Fixed some issues for language service

## 3.4.6.20220420
* HBuilderX language service switched from Java to Node
* Fixed a bug where files in the editor would not be automatically refreshed after Git updated files in some cases
* Adjust Share to Weblink, adjust code area code coloring

## 3.3.13.20220314
* Fixed some minor issues

## 3.3.11.20220210
* Fixed some minor issues

## 3.3.10.20220124
* Fixed some minor issues

## 3.3.9.20220121
* Fixed the bug that the project manager project cannot be expanded in some cases on MacOSX

## 3.3.5.20211229
* Fixed some minor issues

## 3.3.4.20211228
* Fixed some minor issues

## 3.3.3.20211225
* Adjust the UI of the new project window [Details](https://hx.dcloud.net.cn/Tutorial/project?id=CreateProjectWindows)
* Added project manager view toolbar, added positioning and folding functions [Details](https://hx.dcloud.net.cn/Tutorial/project?id=toolbar)
* Fixed a crash in the editor when Find Symbols by clicking on the search area or the built-in Explorer address bar.
* Fixed the Bug where MacOSX failed to run projects to iOS emulator when the HBuilderX installation path had a space.

## 3.2.16.20211122
* Fixed the bug that the hover code assist the editor to crash

## 3.2.15.20211120
* Added Files larger than 1M in size do not display hover code assist
* Fixed the bug that caused the node process to fail to start when the max-old-space-size configured in the operating system environment variables was too large

## 3.2.12.20211029
* Added HBuilderX plug-in development breakpoint debugging
* Added hover code assist [Details](https://hx.dcloud.net.cn/Tutorial/Language/Overview?id=hover-code-assist)
* Added Terminal supports clicking on the URL to jump to the browser [Details](https://hx.dcloud.net.cn/Tutorial/UserGuide/terminal?id=open-links)
* Fixed the bug that when the terminal input exceeds a certain length, the wrong line is displayed
* Fixed the bug that the editor window exceeds the screen area when creating multiple terminals
* Fixed the bug that the editor bookmarks are lost due to code formatting

## 3.2.9.20210927
* Added HBuilderX supports localized language pack extension [Details](https://github.com/dcloudio/hbuilderx-language-packs)
* Vue3 improvements [Details](https://hx.dcloud.net.cn/Tutorial/Language/vue-next)
* Added Configure whether you receive automatic updates.