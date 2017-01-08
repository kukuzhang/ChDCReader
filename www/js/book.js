define(["jquery", "util"], function($, util) {
    "use strict"



    // ****** Book ****
    function Book(){
    };

    // book 全局的错误码定义
    /*
     * 2xx 章节错误
     * 3xx 设置源错误
     * 4xx 书籍错误
     */
    Book.getError = function(errorCode){
        var bookErrorCode = {
            201: "未发现该章节！",
            202: "没有更新的章节了！",
            203: "前面没有章节了！",
            205: "索引值应该是数字！",
            206: "章节内容错误",
            207: "未从缓存中发现该章节",

            301: "设置主要内容来源失败！",
            302: "未找到该源",
            401: "源配置不正确！",
            404: "未在当前的源中找到该书！"
        };
        return {
            id: errorCode,
            message: bookErrorCode[errorCode]
        }
    }

    // 通过书名字和目录搜索唯一的书籍
    Book.getBook = function(bookSourceManager, bsid, bookName, bookAuthor, success, fail){
        if(bsid && bookName && bookAuthor && bsid in bookSourceManager.sources){
            // 通过当前书名和作者名搜索添加源
            Book.searchBook(bookSourceManager, bsid, bookName,
                function(books, keyword, bsid){
                    var i = util.arrayIndex(books, null, function(e){
                        return e.name == bookName && e.author == bookAuthor;
                    });
                    if(i >= 0){
                        // 找到书籍了
                        var book = books[i];
                        success(book, bsid);
                    }
                    else{
                        if(fail)fail(Book.getError(404));
                    }
                },
                fail);
        }
        else{
            if(fail)fail(Book.getError(401));
        }
    }

    // 搜索书籍
    Book.searchBook = function(bookSourceManager, bsid, keyword, success, fail){
        var bs = bookSourceManager.sources[bsid];
        if(!bs)return;
        util.log('Search Book from: ' + bsid);

        var search = bs.search;
        var searchLink = util.format(search.url, {keyword: keyword});
        util.getDOM(searchLink, {}, getBookFromHtml, fail);

        function getBookFromHtml(html){
            var info = search.info;
            var detail = info.detail;
            var books = [];
            var bookItems = html.find(info.book);
            bookItems.each(function(){
                    var element = $(this);
                    var book = new Book();
                    book.name = Book.fixer.fixName(element.find(detail.name).text());  // 书名
                    book.author = Book.fixer.fixAuthor(element.find(detail.author).text());  // 作者
                    book.catagory = Book.fixer.fixCatagory(element.find(detail.catagory).text());  // 分类
                    book.cover = util.fixurl(element.find(detail.cover).attr("data-src"), searchLink);  // 封面
                    book.complete = Book.fixer.fixComplete(element.find(detail.complete).text());  // 是否完结
                    book.introduce = Book.fixer.fixIntroduce(element.find(detail.introduce).text());  // 简介
                    book.lastestChapter = Book.fixer.fixLastestChapter(element.find(detail.lastestChapter).text());  // 最新的章节

                    book.sources = {}; // 内容来源
                    var bss = new BookSource(bs.contentSourceWeight);
                    bss.detailLink = util.fixurl(element.find(detail.link).attr("href"), searchLink);
                    book.sources[bsid] = bss;

                    book.mainSource = bsid;  // 主要来源
                    return books.push(book);
                });
            if(success)success(books, keyword, bsid);
        };
    };

    // 属性
    // Book.prototype.id = "";  // 编号
    Book.prototype.name = "";  // 书名
    Book.prototype.author = "";  // 作者
    Book.prototype.catagory = "";  // 分类
    Book.prototype.cover = "";  // 封面
    Book.prototype.complete = undefined;  // 是否完结
    Book.prototype.introduce = "";  // 简介
    Book.prototype.sources = undefined;  // 内容来源
    Book.prototype.mainSource = undefined;  // 当前来源
    Book.prototype.lastestChapter = undefined;  // 最新的章节

    // 修复属性用的工具函数
    Book.fixer = {
        fixChapterContent: function(html){
            // 从 HTML 文本中获取格式化的正文
            return util.html2text(html);
        },

        fixChapterTitle: function(text){
            // 从 HTML 文本中获取格式化的正文
            return text.trim();
        },

        fixName: function(text)
        {
            //书名
            text = text.trim();
            return text;
        },

        fixAuthor: function(text)
        {
            //作者
            text = text.trim();
            return text;
        },

        fixCatagory: function(text)
        {
            //分类
            text = text.trim();
            return text;
        },

        // fixCover: function(text)
        // {
        //     //封面
        //     text = text.trim();
        //     return text;
        // },

        fixComplete: function(text)
        {
            //是否完结
            text = text.trim();
            return text;
        },

        fixIntroduce: function(text)
        {
            //简介
            text = text.trim();
            return text;
        },

        // fixReadingChapter: function(text)
        // {
        //     //读到的章节
        //     text = text.trim();
        //     return text;
        // },

        fixLastestChapter: function(text)
        {
            //最新的章节
            text = text.replace(/^最新更新/, '').trim()
            return text;
        }
    };

    // 方法
    // 获取当前书籍指定的目录源信息
    Book.prototype.getBookSource = function(success, fail, options){
        var self = this;
        options = $.extend(true, {}, options);
        options.bookSourceId = options.bookSourceId || self.mainSource;
        var bs = self.sources[options.bookSourceId];
        if(bs){
            if(success)success(bs, options.bookSourceId);
        }
        else{
            var bsm = options.bookSourceManager.sources[options.bookSourceId];
            if(bsm)
            {
                var bss = new BookSource(bsm.contentSourceWeight);
                self.sources[options.bookSourceId] = bss;

                if(success)success(bss, options.bookSourceId);
            }
            else{
                if(fail)fail(Book.getError(302));
            }
        }
    }

    // 获取当前书籍指定的目录源信息
    Book.prototype.__getBookSourceDetailLink = function(success, fail, options){
        var self = this;
        options = $.extend(true, {}, options);
        options.bookSourceId = options.bookSourceId || self.mainSource;

        self.getBookSource(function(bs, bsid){

            if(bs.detailLink){
                success(bs.detailLink, bsid, bs);
            }
            else if(bs.disable){
                if(fail)fail(Book.getError(404));
            }
            else{
                Book.getBook(options.bookSourceManager, options.bookSourceId, self.name, self.author,
                    function(book, bsid){
                        // 找到书籍了
                        bs.detailLink = book.sources[bsid].detailLink;
                        if(success)success(bs.detailLink, bsid, bs);
                    },
                    function(error){
                        if(error.id == 404){
                            // 没找到该书就标记一下，下次直接跳过
                            bs.disable = true;
                        }
                        if(fail)fail(error);
                    });
            }
        },fail, options);
    };

    // 检查源是否有缺失
    Book.prototype.checkBookSources = function(bookSourceManager){
        var self = this;
        var sources = bookSourceManager.sources;
        for(var k in sources){
            if(!(k in self.sources)){
                var bss = new BookSource(sources[k].contentSourceWeight);
                self.sources[k] = bss;
            }
        }
    }

    // 设置主源
    Book.prototype.setMainSource = function(bookSourceId, success, fail, options){
        var self = this;
        if(self.mainSource == bookSourceId)
            return;

        options = $.extend(true, {}, options);
        if(bookSourceId && bookSourceId in options.bookSourceManager.sources){
            self.mainSource = bookSourceId;
            if(success)success(self);
        }
        else{
            if(fail)fail(Book.getError(301));
        }
    };

    // 使用详情页链接刷新书籍信息
    // 前提：book.sources 中有详情链接
    Book.prototype.refreshBookInfo = function(success, fail, options, onlyLastestChapter){
        var self = this;
        options = $.extend(true, {}, options);
        options.bookSourceId = options.bookSourceId || self.mainSource;
        self.__getBookSourceDetailLink(function(detailLink, bsid, bs){
            var bsm = options.bookSourceManager.sources[bsid];
            var detail = bsm.detail;
            var info = detail.info;

            util.getDOM(detailLink, {}, getBookDetailFromHtml, fail);

            function getBookDetailFromHtml(html){
                // 更新信息的时候不更新书名和作者，因为换源的时候需要用到
                if(!onlyLastestChapter){
                    self.catagory = Book.fixer.fixCatagory(html.find(info.catagory).text());  // 分类
                    self.cover = util.fixurl(html.find(info.cover).attr("data-src"), detailLink);  // 封面
                    self.complete = Book.fixer.fixComplete(html.find(info.complete).text());  // 是否完结
                    self.introduce = Book.fixer.fixIntroduce(html.find(info.introduce).text());  // 简介
                }
                var lastestChapter = Book.fixer.fixLastestChapter(html.find(info.lastestChapter).text());  // 最新的章节
                var lastestChapterUpdated = false;
                if(self.lastestChapter != lastestChapter){
                    self.lastestChapter = lastestChapter;
                    lastestChapterUpdated = true;
                }
                if(success)success(lastestChapterUpdated);
            };
        },
        fail, options);
    };

    // 刷新目录
    Book.prototype.refreshCatalog = function(success, fail, options){
        util.log('Refresh Catalog!');

        var self = this;
        options = $.extend(true, {}, options);
        options.bookSourceId = options.bookSourceId || self.mainSource;
        self.__getBookSourceDetailLink(function(detailLink, bsid, bs){
            util.getDOM(detailLink, {}, s, fail);

            function s(html){
                var catalog = self.__getBookCatalogFromHTML(html, detailLink, options);
                bs.catalog = catalog;
                bs.updatedCatalog = true;
                if(success)success(catalog);
            };
        },
        fail, options);
    };

    // 从 HTML 中获取书籍章节目录
    Book.prototype.__getBookCatalogFromHTML = function(html, htmlLink, options){
        var self = this;
        options = $.extend(true, {}, options);
        options.bookSourceId = options.bookSourceId || self.mainSource;
        var catalog = [];
        var bsm = options.bookSourceManager.sources[options.bookSourceId];
        if(!bsm)return;
        var info = bsm.catalog.info;

        html.find(info.link).each(function(){
            var element = $(this);
            var chapter = new Chapter();
            chapter.link = util.fixurl(element.attr('href'), htmlLink);
            if(info.vipLinkPattern && chapter.link.match(info.vipLinkPattern)){
               chapter.link = null;
            }

            chapter.title = Book.fixer.fixChapterTitle(element.text());
            // 去重复
            // var i = util.arrayIndex(catalog, null, function(e){
            //     return e && e.title == chapter.title;
            // });
            // if(i >= 0){
            //     catalog[i] = null;
            // }
            catalog.push(chapter);
        });
        return catalog.filter(function(e){return e});
    };

    // 获取目录
    // options:
    // * forceRefresh 强制刷新
    Book.prototype.getCatalog = function(success, fail, options){
        var self = this;
        options = $.extend(true, {}, options);
        options.bookSourceId = options.bookSourceId || self.mainSource;

        self.getBookSource(function(bs){
            // var bsm = options.bookSourceManager.sources[options.bookSourceId];
            if(!options.forceRefresh && bs.catalog){
                if(success)success(bs.catalog);
            }
            else{
                self.refreshCatalog(success, fail, options);
            }
        },
        fail, options);
    }

    // *************************** 章节部分 ****************

    // 获取指定源的指定索引的章节
    Book.prototype.index = function(chapterIndex, success, fail, options){
        if($.type(chapterIndex) != "number"){
            if(fail)
                fail(Book.getError(205));
            return;
        }

        if(chapterIndex < 0){
            if(fail)
                fail(Book.getError(203));
            return;
        }

        var self = this;
        options = $.extend(true, {}, options);
        options.bookSourceId = options.bookSourceId || self.mainSource;

        self.getCatalog(function(catalog){
            if(chapterIndex >= 0 && chapterIndex < catalog.length){
                // 存在于目录中
                if(success)success(catalog[chapterIndex], chapterIndex, catalog);
            }
            else if(chapterIndex >= catalog.length)
            {
                // 超界了
                // 没有下一章节或者目录没有更新
                // 更新一下主目录源，然后再搜索
                self.refreshCatalog(function(catalog){
                    if(chapterIndex >=0 && chapterIndex < catalog.length){
                        // 存在于目录中
                        if(success)success(catalog[chapterIndex], chapterIndex, catalog);
                    }
                    else{
                        if(fail)fail(Book.getError(202));
                    }
                }, fail, options);
            }
            else{
                // index < 0
                if(fail)fail(Book.getError(203));
            }
        }, fail, options);
    }

    // 在指定的源 B 中搜索目录源的中某章节的相对应的章节
    Book.prototype.fuzzySearch = function(sourceB, index, success, fail, options){

        var self = this;
        options = $.extend(true, {}, options);
        options.bookSourceId = options.bookSourceId || self.mainSource;

        if(options.bookSourceId == sourceB){
        // 两源相同
            self.index(index, function(chapter, chapterIndex, catalog){
                if(success)success(chapter, chapterIndex, catalog, sourceB);
            },
            fail, options);
        }
        else{
            // 获取目录源的目录
            self.getCatalog(function(catalog){
                // 获取源B 的目录
                options.bookSourceId = sourceB;
                self.getCatalog(function(catalogB){
                    var indexB = util.listMatch(catalog, catalogB, index, Chapter.equalTitle);
                    if(indexB >= 0){
                        // 找到了
                        if(success){
                            var chapterB = catalogB[indexB];
                            success(chapterB, indexB, catalogB, sourceB);
                        }
                    }
                    else{
                        // 没找到
                        // 更新章节目录然后重新查找
                        self.refreshCatalog(function(catalogB){
                            var indexB = util.listMatch(catalog, catalogB, index, Chapter.equalTitle);
                            if(indexB >= 0){
                                // 找到了
                                if(success){
                                    var chapterB = catalogB[indexB];
                                    success(chapterB, indexB, catalogB, sourceB);
                                }
                            }
                            else{
                                if(fail)fail(Book.getError(201));
                            }
                        },
                        fail, options);
                    }
                },
                fail, options);
            },
            fail, options);
        }

    };

    // 从网上获取指定的章节
    // chapterIndex 是从主要目录源中获取的章节索引
    // options
    // * noInfluenceWeight false 是否要改变内容源的权重
    // * cacheDir 缓存章节的目录
    // * excludes 要排除的内容源
    // * contentSourceId 希望使用的内容源
    // * contentSourceChapterIndex 希望匹配的索引
    // * onlyCacheNoLoad 只缓存章节，不加载章节
    // * count 获取的数目，当 count == 1 时，用于前端获取并显示数据，当 count >= 1 时，用于缓存章节
    // 成功返回：章节对象，目录源章节索引，内容源，内容源章节索引
    Book.prototype.getChapter = function(chapterIndex, success, fail, options){

        if(chapterIndex < 0){
            if(fail)
                fail(Book.getError(203));
            return;
        }

        var self = this;
        options = $.extend(true, {}, options);
        options.bookSourceId = options.bookSourceId || self.mainSource;

        self.index(chapterIndex, function(chapter, index, catalog){
            self.__getChapterFromContentSources(catalog, index, success, fail, options);
        }, fail, options);
    };

    // 按一定的算法从所有的源中找到合适的章节内容
    // options
    // * noInfluenceWeight false 是否要改变内容源的权重
    // * cacheDir 缓存章节的目录
    // * excludes 要排除的内容源
    // * contentSourceId 希望使用的内容源
    // * contentSourceChapterIndex 希望匹配的索引
    // * count 获取的数目
    // * onlyCacheNoLoad 只缓存章节，不加载章节
    // 成功返回：章节对象，目录源章节索引，内容源，内容源章节索引
    Book.prototype.__getChapterFromContentSources = function(catalog, index, success, finalFail, options){
        var self = this;
        options = $.extend(true, {}, options);
        options.bookSourceId = options.bookSourceId || self.mainSource;

        var chapterA = catalog[index];
        var result = []; // 结果的集合，按权重排序
        var count = options.count || 1; // 想获取的数目

        // ***** 常量 ******
        var FOUND_WEIGHT = 0; // 找到后增加的权重
        var NOTFOUND_WEIGHT = -2; // 没找到的权重
        var EXECLUDE_WEIGHT = -4; // 排除的权重
        var INCLUDE_WEIGHT = 0; // 指定的源
        // *****************

        // 如果选项中有 contentSourceId 和 contentSourceChapterIndex，则比对指定的索引
        if(options.contentSourceId && $.type(options.contentSourceChapterIndex) == 'number'){
            getChapterFromSelectBookSourceAndSelectSourceChapterIndex(options.contentSourceId, options.contentSourceChapterIndex);
        }
        else if(options.contentSourceId){
            // 仅有指定的源
            getChapterFromContentSources2(options.contentSourceId);
        }
        else{
            getChapterFromContentSources2();
        }

        // 把结果添加到 Result
        function addChapterToResult(chapterB, indexB, source){
            if(!options.noInfluenceWeight)
                self.sources[source].weight += FOUND_WEIGHT;
            var chapter = new Chapter();
            chapter.title = chapterA.title;
            chapter.content = chapterB.content;
            result.push({
                chapter: chapter,
                index: index,
                options: {
                    contentSourceId: source,
                    contentSourceChapterIndex: indexB
                }
            });
        }

        // 提交结果
        function submitResult(){
            if(result.length <= 0){
                if(finalFail)
                    finalFail(Book.getError(201));
            }
            else{
                if(success){
                    if(options.count && options.count > 1)
                        success(result);
                    else{
                        var r = result[0];
                        success(r.chapter, r.index, r.options);
                    }
                }
            }
        }

        function getChapterFromContentSources2(includeSource){

            var opts = $.extend(true, {}, options);

            var contentSources = util.objectSortedKey(self.sources, 'weight'); // 按权重从小到大排序的数组
            // 去掉要排除的源
            if(options.excludes){
                for(var ei = 0; ei < options.excludes.length; ei++)
                {
                    var exclude = options.excludes[ei];
                    var i = contentSources.indexOf(exclude);
                    delete contentSources[i];
                    if(!options.noInfluenceWeight)
                        self.sources[exclude].weight += EXECLUDE_WEIGHT;
                }
            }
            if(includeSource){
                var i = contentSources.indexOf(includeSource);
                delete contentSources[i];
                // 放到结尾处
                contentSources.push(includeSource);
                if(!options.noInfluenceWeight)
                    self.sources[includeSource].weight += INCLUDE_WEIGHT;
            }

            next();

            // 失败后换下一个源
            function next(){
                // 注意网络不通的问题
                if(contentSources.length <= 0 || count <= 0){
                    submitResult();
                    return;
                }
                opts.bookSourceId = contentSources.pop();

                if(!opts.bookSourceId)
                    next();

                self.fuzzySearch(opts.bookSourceId, index,
                    function(chapterBB, indexB, catalogB, sourceB){
                        self.__getChapterContent(chapterBB, indexB,
                            function(chapterB){
                                // 找到了章节
                                addChapterToResult(chapterB, indexB, sourceB);
                                count--;
                                next();
                            },
                            failToNext, opts);
                    }
                    , failToNext, options);
            }

            function failToNext(error){
                if(!options.noInfluenceWeight)
                    self.sources[opts.bookSourceId].weight += NOTFOUND_WEIGHT;
                next();
            }
        }


        function handleWithNormalMethod(error){
            // 失败则按正常方式获取
            // 注意网络不通的问题
            getChapterFromContentSources2();
        }

        // 从指定的源和索引中获取章节
        function getChapterFromSelectBookSourceAndSelectSourceChapterIndex(contentSourceId, contentSourceChapterIndex){

            var opts = $.extend(true, {}, options);
            opts.bookSourceId = contentSourceId;
            if(!options.noInfluenceWeight)
                self.sources[contentSourceId].weight += INCLUDE_WEIGHT;

            self.index(contentSourceChapterIndex,
                function(chapterB, indexB, catalogB){
                if(Chapter.equalTitle(chapterA, chapterB)){
                    self.__getChapterContent(chapterB, contentSourceChapterIndex,
                        function(chapterB){
                            // 找到了章节
                            addChapterToResult(chapterB, contentSourceChapterIndex, contentSourceId);
                            count--;
                            if(count > 0){
                                debugger;
                                handleWithNormalMethod();
                            }
                            else{
                                submitResult();
                            }
                        },
                        handleWithNormalMethod, opts);
                }
                else{
                    // 不相等，则按正常方式获取
                    handleWithNormalMethod();
                }
            },
            handleWithNormalMethod, opts);
        }
    }

    // 从网络上获取章节内容
    Book.prototype.__getChapterContentFromBookSource = function(chapterLink, success, fail, options){
        if(!chapterLink){
            if(fail)fail(Book.getError(206));
            return;
        }

        util.log('Load Chpater content from Book Source: ' + chapterLink);

        var self = this;
        options = $.extend(true, {}, options);

        // 默认从主要内容源中获取章节
        options.bookSourceId = options.bookSourceId || self.mainSource;
        var bsm = options.bookSourceManager.sources[options.bookSourceId];
        var info = bsm.chapter.info;
        util.getDOM(chapterLink, {}, getChapterFromHtml, fail);

        function getChapterFromHtml(html){
            var chapter = new Chapter();
            chapter.content = Book.fixer.fixChapterContent(html.find(info.content).html());
            if(!chapter.content){
                // 没有章节内容就返回错误
                if(fail)fail(Book.getError(206));
                return;
            }
            chapter.link = chapterLink;
            chapter.title = Book.fixer.fixChapterTitle(html.find(info.title).text());
            // chapter.modifyTime = html.find(info.modifyTime).text().trim();
            if(success)success(chapter);
        }
    };

    // 从本地或网络上获取章节内容
    // * cacheDir 缓存章节的目录
    // * onlyCacheNoLoad 只缓存章节，不加载章节
    // success(chapter)
    Book.prototype.__getChapterContent = function(chapter, index, success, fail, options){
        var self = this;
        options = $.extend(true, {}, options);
        // 默认从主要内容源中获取章节
        options.bookSourceId = options.bookSourceId || self.mainSource;

        // 从缓存中获取章节内容
        self.__getCacheChapter(index,
            function(c){
                if(success)success(options.onlyCacheNoLoad? chapter: c);
            },
            function(error){
                if(error.id == 207)
                {
                    // 从缓存中获取失败的话，再从网上获取章节，然后缓存到本地
                    self.__getChapterContentFromBookSource(chapter.link,
                        function(chapter){
                            // 获取章节成功
                            if(success)success(chapter);
                            // 缓存该章节
                            self.__cacheChapter(index, chapter, null, null, options);
                        }, fail, options);
                }
                else{
                    if(fail)fail(error);
                }
            }, options);
    }

    // 获取章节的缓存位置
    // * cacheDir 缓存章节的目录
    Book.prototype.__getCacheChapterLocation = function(index, options){

        var self = this;
        var bookSourceId = options.bookSourceId || '';
        var bid = self.name + '.' + self.author;
        var chapterFileName = index + '.' + bookSourceId;
        var cacheDir = options.cacheDir || "chapter";
        var dest = cacheDir + "_" + bid + "_" + chapterFileName;
        return dest;
    }

    // 获取指定的章节
    // * cacheDir 缓存章节的目录
    // * onlyCacheNoLoad 只缓存章节，不加载章节
    Book.prototype.__getCacheChapter = function(index, success, fail, options){

        var self = this;
        var dest = self.__getCacheChapterLocation(index, options);

        if(options.onlyCacheNoLoad){
            util.dataExists(dest,
                function(){
                    if(success)success(null);
                },
                function(){
                    // 章节不存在
                    if(fail)fail(Book.getError(207));
                }, true);
            return;
        }
        else{
            // 获取章节内容
            util.loadData(dest,
                function(data){
                    // 章节存在
                    if(data != null){
                        if(success){
                            var chapter = new Chapter();
                            // 类型转换
                            chapter = $.extend(true, chapter, data);
                            success(chapter);
                        }
                    }
                    else{
                        if(fail)fail(Book.getError(207));
                    }
                },
                function(){
                    if(fail)fail(Book.getError(207));
                }, true);
        }
    };

    // 缓存章节内容
    // * cacheDir 缓存章节的目录
    Book.prototype.__cacheChapter = function(index, chapter, success, fail, options){

        var self = this;
        // 保存到文件中
        var dest = self.__getCacheChapterLocation(index, options);
        util.saveData(dest, chapter, success, fail, true); // 将 JSON 对象序列化到文件中
    };

    // 一次获取多个章节
    // chapterIndex 是从主要目录源中获取的章节索引
    // nextCount 获取的章节数目
    // options
    // * noInfluenceWeight false 是否要改变内容源的权重
    // * cacheDir 缓存章节的目录
    // * excludes 要排除的内容源
    // * contentSourceId 希望使用的内容源
    // * contentSourceChapterIndex 希望匹配的索引
    // * count 获取的数目，当 count == 1 时，用于前端获取并显示数据，当 count >= 1 时，用于缓存章节
    // 成功返回：章节对象，目录源章节索引，内容源，内容源章节索引
    Book.prototype.getChapters = function(chapterIndex, nextCount, success, fail, end, options){

        var self = this;
        options = $.extend(true, {}, options);
        options.bookSourceId = options.bookSourceId || self.mainSource;

        var endParams = [];

        chapterIndex--;
        options.contentSourceChapterIndex--;
        nextCount++;
        next();
        function next(){
            chapterIndex++;
            options.contentSourceChapterIndex++;
            nextCount--;
            if(nextCount > 0){
                self.getChapter(chapterIndex,
                    function(chapter, index, opts){
                        options = $.extend(true, options, opts);
                        if(success)success(chapter, index, opts);
                        endParams.length = 0;
                        endParams.push(chapter);
                        endParams.push(index);
                        endParams.push(opts);
                        next();
                    },
                    function(error){
                        if(error.id == 202){
                            // 当没有更新的章节时，直接退出
                            if(fail)fail(error);
                            if(end)end(endParams[0], endParams[1], endParams[2]);
                            return;
                        }
                        else if(error.id == 203){
                            if(success)success(null, chapterIndex, options);
                            endParams.length = 0;
                            endParams.push(null);
                            endParams.push(chapterIndex);
                            endParams.push(options);
                            next();
                        }
                        else{
                            if(!fail || fail(error))
                                next();
                            else{
                                if(end)end(endParams[0], endParams[1], endParams[2]);
                                return;
                            }
                        }
                    }, options);
            }
            else{
                if(end)
                    end(endParams[0], endParams[1], endParams[2]);
            }
        }

    }


    // chapterIndex 是从主要目录源中获取的章节索引
    // nextCount 缓存的章节数目
    // options
    // * noInfluenceWeight false 是否要改变内容源的权重
    // * cacheDir 缓存章节的目录
    // * excludes 要排除的内容源
    // * contentSourceId 希望使用的内容源
    // * contentSourceChapterIndex 希望匹配的索引
    // * count 获取的数目，当 count == 1 时，用于前端获取并显示数据，当 count >= 1 时，用于缓存章节
    // 成功返回：章节对象，目录源章节索引，内容源，内容源章节索引
    Book.prototype.cacheChapter = function(chapterIndex, nextCount, options){

        var self = this;
        options = $.extend(true, {}, options);
        options.bookSourceId = options.bookSourceId || self.mainSource;
        options.noInfluenceWeight = true;
        options.onlyCacheNoLoad = true;

        self.getChapters(chapterIndex, nextCount, null, null, null, options);
    }
    // *************************** 章节部分结束 ****************

    // 获取书籍最新章节
    Book.prototype.refreshLastestChapter = function(success, fail, options){
        var self = this;
        self.refreshBookInfo(success, fail, options, true);
    };

    // **** Chapter ****
    function Chapter(){

    }

    Chapter.prototype.link = undefined;    // 链接
    Chapter.prototype.title = undefined;    // 标题
    Chapter.prototype.content = undefined;  // 内容
    // Chapter.prototype.modifyTime = undefined;  // 修改时间

    // 判断两个标题是否相等，传入的是章节
    Chapter.equalTitle = function(chapterA, chapterB){
        return Chapter.equalTitle2(chapterA.title, chapterB.title);
    }

    // 判断两个标题是否相等，传入的是章节标题
    Chapter.equalTitle2 = function(chapterTitleA, chapterTitleB){
        if(!chapterTitleA || !chapterTitleB)
            return false;
        // 比较去掉所有空格和标点符号之后的所有符号
        function stripString(str){
            // 去除英文字符串
            str = str.replace(/[!"#$%&'()*+,./:;<=>?@[\]^_`{|}~\\-]/g, '');
            // 去除中文字符串
            str = str.replace(/[！@#￥%……&*（）——+=~·《》，。？/：；“{}】【‘|、]/g, '');
            // 去除空白字符
            str = str.replace(/\s/g, '');
            return str;
        }
        // TODO：模糊判等
        return stripString(chapterTitleA) == stripString(chapterTitleB);
    }

    // **** BookSource *****
    function BookSource(weight){
        this.updatedCatalog = true;
        this.disable = false;
        this.weight = weight || 0;
    };
    BookSource.prototype.detailLink = null; // 详情页链接
    BookSource.prototype.catalog = null; // 目录
    BookSource.prototype.weight = 0;
    BookSource.prototype.updatedCatalog = true; // 内容是否被更新，用于保存当本地文件中判断是否需要更新本地文件中的数据
    BookSource.prototype.disable = false;


    // **** BookSourceManager *****
    function BookSourceManager(configFileOrConfig){
        var self = this;
        if($.type(configFileOrConfig) == 'string'){
            $.getJSON(configFileOrConfig, function(data){
                self.sources = data;
            });
        }
        else{
            self.sources = configFileOrConfig;
        }
    };
    BookSourceManager.prototype.sources = undefined;

    // 按主源权重从小到大排序的数组
    BookSourceManager.prototype.getSourcesKeysByMainSourceWeight = function(){
        return util.objectSortedKey(this.sources, 'mainSourceWeight'); // 按主源权重从小到大排序的数组
    }

    // 按内容源权重从小到大排序的数组
    BookSourceManager.prototype.getSourcesKeysByContentSourceWeight = function(configFileOrConfig){

    }

    // 检查源是否正确
    BookSourceManager.prototype.checkBookSources = function(configFile, finish){
        $.getJSON(configFile, function(data){
            // TODO
            self.sources = data;
            if(finish)finish();
        });
    }

    // **** Return package *****
    return {
        Book: Book,
        BookSourceManager: BookSourceManager,
        BookSource: BookSource,
        Chapter: Chapter
    };
});
