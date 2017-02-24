define(["jquery", "util", "Book", "BookSourceManager", "page", "BookShelf", "bootstrap"], function($, util, Book, BookSourceManager, page, BookShelf) {

    "use strict"

    let settings = {
        cacheChapterCount: 3, // 缓存后面章节的数目
        cacheCountEachChapter: 1, // 默认情况下每章缓存的源章节数目
        cacheCountEachChapterWithWifi: 3, // 在 Wifi 下每章缓存的源章节数目
        // chapterIndexOffset: 1,  // 当前章节的偏移值
        // chapterCount: 3,   // 每次加载的章节数目
        nighttheme: "night1", // 夜间主题
        daytheme: "", // 白天主题
        night: false
    };


    let app = {
        /**************** 全局变量 *******************/
        settings: settings,
        // 书籍来源管理器
        bookSourceManager: null,

        // 书架
        bookShelf: null,
        util: util,
        page: page,
        init: function(){
            if(typeof cordova != 'undefined'){
                document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
                document.addEventListener("chcp_updateInstalled", this.onUpdateInstalled.bind(this), false);
            }
            else{
                $(this.onDeviceReady.bind(this));
            }
        },
        // 检查资源更新
        // * isInstanceInstall 下载好资源后是否立即进行安装
        chekcUpdate: function(isInstanceInstall, showMessage){

            if(!window.chcp)
                return;
            function fetchUpdateCallback(error, data) {
                if (error) {
                    if(error.code == 2){
                        if(showMessage)
                            util.showMessage('没有更新');
                    }
                    else{
                        let errMsg = error.description + "(" + error.code + ")";
                        util.error('Fail to download update: ' + errMsg);
                        util.showError('更新下载失败！\n' + errMsg);
                    }
                }
                else{
                    if(!isInstanceInstall){
                        util.showMessage('更新已下载，下次启动时生效！');
                    }
                    else{
                        util.log('Start to install update');
                        chcp.installUpdate(installationCallback);
                    }
                }
            }

            function installationCallback(error) {
                if (error) {
                    let errMsg = error.description + "(" + error.code + ")";
                    util.error('Fail to install update: ' + errMsg);
                    util.showError('安装更新失败！\n' + errMsg);
                }
                else {
                    util.log('Success to install update');
                    // util.showMessage('安装更新成功！');
                }
            }

            // 查看本地是否有尚未安装的更新
            chcp.isUpdateAvailableForInstallation(function(error, data) {
                if (error) {
                    if(showMessage)
                        util.showMessage('开始检查资源更新。。。');
                    util.log('Start to check update');
                    chcp.fetchUpdate(fetchUpdateCallback);
                }
                else{
                    util.log('Start to install update');
                    chcp.installUpdate(installationCallback);
                }
            });
        },

        showLoading: function(){
            $("#dialogLoading").modal('show');
        },
        hideLoading: function(){
            $("#dialogLoading").modal('hide');
        },

        onDeviceReady: function() {
            let self = this;
            self.__loadSettings(function(){
                self.bookSourceManager = new BookSourceManager("data/booksources.json");
                self.bookSourceManager.init();

                self.bookShelf = new BookShelf();
                page.init();
                // 设置主题
                page.setTheme(self.settings.night ? self.settings.nighttheme : self.settings.daytheme);

                page.showPage("bookshelf");
                self.chekcUpdate(true);
            });

        },
        onUpdateInstalled: function(){
            util.showMessage("资源更新成功！");
            // location.reload();
        },
        saveSettings: function(){
            util.saveData('settings', this.settings);
        },
        __loadSettings: function(success){
            let self = this;
            util.loadData('settings', function(data){
                if(data)
                    self.settings = data;
                if(success)success();
            }, function(){
                if(success)success();
            })

        }
    };

    window.app = app;
    app.init();
    return app;
});