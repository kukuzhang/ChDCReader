"use strict";

define(["util", "uiutil", "Book", "BookSourceManager", "PageManager", "BookShelf", "bootstrap"], function (util, uiutil, Book, BookSourceManager, PageManager, BookShelf) {

  "use strict";

  var app = {
    settings: {
      settings: {
        cacheChapterCount: 3,
        cacheCountEachChapter: 1,
        cacheCountEachChapterWithWifi: 3,
        nighttheme: "night1",
        daytheme: "",
        night: false
      },

      load: function load() {
        var _this = this;

        return util.loadData('settings').then(function (data) {
          if (data) _this.settings = data;
          return data;
        }).catch(function (e) {
          return e;
        });
      },
      save: function save() {
        util.saveData('settings', this.settings);
      }
    },

    bookSourceManager: null,

    bookShelf: null,
    util: util,
    page: null,
    error: {
      __error: {},
      load: function load(file) {
        var _this2 = this;

        return util.getJSON(file).then(function (data) {
          _this2.__error = data;
        });
      },
      getMessage: function getMessage(errorCode) {
        if (errorCode in this.__error) return this.__error[errorCode];
        if (util.type(errorCode) == "error") return errorCode.message;
      }
    },
    init: function init() {

      if (typeof cordova != 'undefined') {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        document.addEventListener("chcp_updateInstalled", this.onUpdateInstalled.bind(this), false);
      } else {
        $(this.onDeviceReady.bind(this));
      }

      this.loadingbar = new uiutil.LoadingBar('./img/loading.gif');
    },
    chekcUpdate: function chekcUpdate(isInstanceInstall, showMessage) {

      if (!window.chcp) return;
      function fetchUpdateCallback(error, data) {
        if (error) {
          if (error.code == 2) {
            if (showMessage) uiutil.showMessage('没有更新');
          } else {
            var errMsg = error.description + "(" + error.code + ")";
            util.error('Fail to download update: ' + errMsg);
            uiutil.showError('更新下载失败！\n' + errMsg);
          }
        } else {
          if (!isInstanceInstall) {
            uiutil.showMessage('更新已下载，下次启动时生效！');
          } else {
            util.log('Start to install update');
            chcp.installUpdate(installationCallback);
          }
        }
      }

      function installationCallback(error) {
        if (error) {
          var errMsg = error.description + "(" + error.code + ")";
          util.error('Fail to install update: ' + errMsg);
          uiutil.showError('安装更新失败！\n' + errMsg);
        } else {
          util.log('Success to install update');
        }
      }

      chcp.isUpdateAvailableForInstallation(function (error, data) {
        if (error) {
          if (showMessage) uiutil.showMessage('开始检查资源更新。。。');
          util.log('Start to check update');
          chcp.fetchUpdate(fetchUpdateCallback);
        } else {
          util.log('Start to install update');
          chcp.installUpdate(installationCallback);
        }
      });
    },


    loadingbar: null,
    showLoading: function showLoading() {
      this.loadingbar.show();
    },
    hideLoading: function hideLoading() {
      this.loadingbar.hide();
    },
    onDeviceReady: function onDeviceReady() {
      var _this3 = this;

      this.page = new PageManager();
      this.error.load("data/errorCode.json");
      this.settings.load().then(function () {
        _this3.bookSourceManager = new BookSourceManager("data/booksources.json");


        _this3.bookShelf = new BookShelf();

        _this3.page.setTheme(_this3.settings.settings.night ? _this3.settings.settings.nighttheme : _this3.settings.settings.daytheme);

        _this3.page.showPage("bookshelf");
        _this3.chekcUpdate(true);
      });
      document.addEventListener("pause", function () {
        app.bookShelf.save();
      }, false);
    },
    onUpdateInstalled: function onUpdateInstalled() {
      uiutil.showMessage("资源更新成功！");
    }
  };

  window.app = app;
  app.init();
  return app;
});