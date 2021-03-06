"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _path = _interopRequireDefault(require("path"));

var _url = _interopRequireDefault(require("url"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _lodash = _interopRequireDefault(require("lodash"));

var _defaults = _interopRequireDefault(require("./defaults"));

var _SiteMapManager = _interopRequireDefault(require("./SiteMapManager"));

var PUBLICPATH = "./public";
var INDEXFILE = "/sitemap.xml";
var RESOURCESFILE = "/sitemap-:resource.xml";

var XSLFILE = _path.default.resolve(__dirname, "./static/sitemap.xsl");

var DEFAULTQUERY = "{\n  allSitePage {\n    edges {\n      node {\n        id\n        slug: path\n        url: path\n      }\n    }\n  }\n  site {\n    siteMetadata {\n      siteUrl\n    }\n  }\n}";
var DEFAULTMAPPING = {
  allSitePage: {
    sitemap: "pages"
  }
};
var siteUrl;

var copyStylesheet = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee(_ref2) {
    var siteUrl, pathPrefix, indexOutput, siteRegex, data, sitemapStylesheet;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            siteUrl = _ref2.siteUrl, pathPrefix = _ref2.pathPrefix, indexOutput = _ref2.indexOutput;
            siteRegex = /(\{\{blog-url\}\})/g; // Get our stylesheet template

            _context.next = 4;
            return _fsExtra.default.readFile(XSLFILE);

          case 4:
            data = _context.sent;
            // Replace the `{{blog-url}}` variable with our real site URL
            sitemapStylesheet = data.toString().replace(siteRegex, _url.default.resolve(siteUrl, _path.default.join(pathPrefix, indexOutput))); // Save the updated stylesheet to the public folder, so it will be
            // available for the xml sitemap files

            _context.next = 8;
            return _fsExtra.default.writeFile(_path.default.join(PUBLICPATH, "sitemap.xsl"), sitemapStylesheet);

          case 8:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));

  return function copyStylesheet(_x) {
    return _ref.apply(this, arguments);
  };
}();

var serializeMarkdownNodes = function serializeMarkdownNodes(node) {
  if (!node.fields.slug) {
    throw Error("`slug` is a required field");
  }

  node.slug = node.fields.slug;
  delete node.fields.slug;

  if (node.frontmatter) {
    if (node.frontmatter.published_at) {
      node.published_at = node.frontmatter.published_at;
      delete node.frontmatter.published_at;
    }

    if (node.frontmatter.feature_image) {
      node.feature_image = node.frontmatter.feature_image;
      delete node.frontmatter.feature_image;
    }
  }

  return node;
}; // Compare our node paths with the ones that Gatsby has generated and updated them
// with the "real" used ones.


var getNodePath = function getNodePath(node, allSitePage) {
  if (!node.path) {
    return node;
  }

  var slugRegex = new RegExp(node.path.replace(/\/$/, "") + "$", "gi");

  for (var _iterator = allSitePage.edges, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
    var _ref3;

    if (_isArray) {
      if (_i >= _iterator.length) break;
      _ref3 = _iterator[_i++];
    } else {
      _i = _iterator.next();
      if (_i.done) break;
      _ref3 = _i.value;
    }

    var page = _ref3;

    if (page.node && page.node.url && page.node.url.replace(/\/$/, "").match(slugRegex)) {
      node.path = page.node.url;
      break;
    }
  }

  return node;
}; // Add all other URLs that Gatsby generated, using siteAllPage,
// but we didn't fetch with our queries


var addPageNodes = function addPageNodes(parsedNodesArray, allSiteNodes, siteUrl) {
  var parsedNodes = parsedNodesArray[0];
  var pageNodes = [];
  var addedPageNodes = {
    pages: []
  };
  var usedNodes = allSiteNodes.filter(function (_ref4) {
    var node = _ref4.node;
    var foundOne;

    for (var type in parsedNodes) {
      parsedNodes[type].forEach(function (fetchedNode) {
        if (node.url === fetchedNode.node.path) {
          foundOne = true;
        }
      });
    }

    return foundOne;
  });

  var remainingNodes = _lodash.default.difference(allSiteNodes, usedNodes);

  remainingNodes.forEach(function (_ref5) {
    var node = _ref5.node;
    addedPageNodes.pages.push({
      url: _url.default.resolve(siteUrl, node.url),
      node: node
    });
  });
  pageNodes.push(addedPageNodes);
  return pageNodes;
};

var serializeSources = function serializeSources(_ref6) {
  var mapping = _ref6.mapping,
      _ref6$additionalSitem = _ref6.additionalSitemaps,
      additionalSitemaps = _ref6$additionalSitem === void 0 ? [] : _ref6$additionalSitem;
  var sitemaps = [];

  for (var resourceType in mapping) {
    sitemaps.push(mapping[resourceType]);
  }

  sitemaps = _lodash.default.map(sitemaps, function (source) {
    // Ignore the key and only return the name and
    // source as we need those to create the index
    // and the belonging sources accordingly
    return {
      name: source.name ? source.name : source.sitemap,
      sitemap: source.sitemap || "pages"
    };
  });

  if (additionalSitemaps) {
    additionalSitemaps.forEach(function (addSitemap, index) {
      if (!addSitemap.url) {
        throw new Error("URL is required for additional Sitemap: ", addSitemap);
      }

      sitemaps.push({
        name: "external-" + (addSitemap.name ? addSitemap.name : addSitemap.sitemap || "pages-" + index),
        url: addSitemap.url
      });
    });
  }

  sitemaps = _lodash.default.uniqBy(sitemaps, "name");
  return sitemaps;
};

var runQuery = function runQuery(handler, _ref7) {
  var query = _ref7.query,
      exclude = _ref7.exclude;
  return handler(query).then(function (r) {
    if (r.errors) {
      throw new Error(r.errors.join(", "));
    }

    var _loop = function _loop(source) {
      // Removing excluded paths
      if (r.data[source] && r.data[source].edges && r.data[source].edges.length) {
        r.data[source].edges = r.data[source].edges.filter(function (_ref8) {
          var node = _ref8.node;
          return !exclude.some(function (excludedRoute) {
            var slug = source === "allMarkdownRemark" || source === "allMdx" ? node.fields.slug.replace(/^\/|\/$/, "") : node.slug.replace(/^\/|\/$/, "");
            excludedRoute = typeof excludedRoute === "object" ? excludedRoute : excludedRoute.replace(/^\/|\/$/, ""); // test if the passed regular expression is valid

            if (typeof excludedRoute === "object") {
              var excludedRouteIsValidRegEx = true;

              try {
                new RegExp(excludedRoute);
              } catch (e) {
                excludedRouteIsValidRegEx = false;
              }

              if (!excludedRouteIsValidRegEx) {
                throw new Error("Excluded route is not a valid RegExp: ", excludedRoute);
              }

              return excludedRoute.test(slug);
            } else {
              return slug.indexOf(excludedRoute) >= 0;
            }
          });
        });
      }
    };

    for (var source in r.data) {
      _loop(source);
    }

    return r.data;
  });
};

var serialize = function serialize(_ref9, _ref10, mapping) {
  if (_ref9 === void 0) {
    _ref9 = {};
  }

  var site = _ref10.site,
      allSitePage = _ref10.allSitePage;
  var _ref11 = _ref9,
      sources = (0, _extends2.default)({}, _ref11);
  var nodes = [];
  var sourceObject = {};
  siteUrl = site.siteMetadata.siteUrl;

  var _loop2 = function _loop2(type) {
    if (mapping[type] && mapping[type].sitemap) {
      var currentSource = sources[type] ? sources[type] : [];

      if (currentSource) {
        sourceObject[mapping[type].sitemap] = sourceObject[mapping[type].sitemap] || [];
        currentSource.edges.map(function (_ref12) {
          var node = _ref12.node;

          if (!node) {
            return;
          }

          node.feature_image = node.context.feature_image; // if a mapping path is set, e. g. `/blog/tag` for tags, update the path
          // to reflect this. This prevents mapping issues, when we later update
          // the path with the Gatsby generated one in `getNodePath`

          if (mapping[type].path) {
            node.path = _path.default.resolve(mapping[type].path, node.slug);
          } else {
            node.path = node.slug;
          } // get the real path for the node, which is generated by Gatsby


          node = getNodePath(node, allSitePage);
          sourceObject[mapping[type].sitemap].push({
            url: _url.default.resolve(siteUrl, node.path),
            node: node
          });
        });
      }
    }
  };

  for (var type in sources) {
    _loop2(type);
  }

  nodes.push(sourceObject);
  var pageNodes = addPageNodes(nodes, allSitePage.edges, siteUrl);

  var allNodes = _lodash.default.merge(nodes, pageNodes);

  return allNodes;
};

exports.onPostBuild = /*#__PURE__*/function () {
  var _ref13 = (0, _asyncToGenerator2.default)( /*#__PURE__*/_regenerator.default.mark(function _callee2(_ref14, pluginOptions) {
    var graphql, pathPrefix, queryRecords, options, indexSitemapFile, resourcesSitemapFile, defaultQueryRecords, manager, resourcesSiteMapsArray, indexSiteMap, _i2, _resourcesSiteMapsArr, sitemap, filePath;

    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            graphql = _ref14.graphql, pathPrefix = _ref14.pathPrefix;
            // Passing the config option addUncaughtPages will add all pages which are not covered by passed mappings
            // to the default `pages` sitemap. Otherwise they will be ignored.
            options = pluginOptions.addUncaughtPages ? _lodash.default.merge(_defaults.default, pluginOptions) : Object.assign(_defaults.default, pluginOptions);
            indexSitemapFile = _path.default.join(PUBLICPATH, pathPrefix, INDEXFILE);
            resourcesSitemapFile = _path.default.join(PUBLICPATH, pathPrefix, RESOURCESFILE);
            delete options.plugins;
            delete options.createLinkInHead;
            options.indexOutput = INDEXFILE;
            options.resourcesOutput = RESOURCESFILE; // We always query siteAllPage as well as the site query to
            // get data we need and to also allow not passing any custom
            // query or mapping

            _context2.next = 10;
            return runQuery(graphql, {
              query: DEFAULTQUERY,
              exclude: options.exclude
            });

          case 10:
            defaultQueryRecords = _context2.sent;

            if (!(!options.query || !options.mapping)) {
              _context2.next = 15;
              break;
            }

            options.mapping = options.mapping || DEFAULTMAPPING;
            _context2.next = 18;
            break;

          case 15:
            _context2.next = 17;
            return runQuery(graphql, options);

          case 17:
            queryRecords = _context2.sent;

          case 18:
            // Instanciate the Ghost Sitemaps Manager
            manager = new _SiteMapManager.default(options);
            _context2.next = 21;
            return serialize(queryRecords, defaultQueryRecords, options.mapping).forEach(function (source) {
              var _loop3 = function _loop3(type) {
                source[type].forEach(function (node) {
                  // "feed" the sitemaps manager with our serialized records
                  manager.addUrls(type, node);
                });
              };

              for (var type in source) {
                _loop3(type);
              }
            });

          case 21:
            // The siteUrl is only available after we have the returned query results
            options.siteUrl = siteUrl;
            options.pathPrefix = pathPrefix;
            _context2.next = 25;
            return copyStylesheet(options);

          case 25:
            resourcesSiteMapsArray = []; // Because it's possible to map duplicate names and/or sources to different
            // sources, we need to serialize it in a way that we know which source names
            // we need and which types they are assigned to, independently from where they
            // come from

            options.sources = serializeSources(options);
            options.sources.forEach(function (type) {
              if (!type.url) {
                // for each passed name we want to receive the related source type
                resourcesSiteMapsArray.push({
                  type: type.name,
                  xml: manager.getSiteMapXml(type.sitemap, options)
                });
              }
            });
            indexSiteMap = manager.getIndexXml(options); // Save the generated xml files in the public folder

            _context2.prev = 29;
            _context2.next = 32;
            return _fsExtra.default.writeFile(indexSitemapFile, indexSiteMap);

          case 32:
            _context2.next = 37;
            break;

          case 34:
            _context2.prev = 34;
            _context2.t0 = _context2["catch"](29);
            console.error(_context2.t0);

          case 37:
            _i2 = 0, _resourcesSiteMapsArr = resourcesSiteMapsArray;

          case 38:
            if (!(_i2 < _resourcesSiteMapsArr.length)) {
              _context2.next = 52;
              break;
            }

            sitemap = _resourcesSiteMapsArr[_i2];
            filePath = resourcesSitemapFile.replace(/:resource/, sitemap.type); // Save the generated xml files in the public folder

            _context2.prev = 41;
            _context2.next = 44;
            return _fsExtra.default.writeFile(filePath, sitemap.xml);

          case 44:
            _context2.next = 49;
            break;

          case 46:
            _context2.prev = 46;
            _context2.t1 = _context2["catch"](41);
            console.error(_context2.t1);

          case 49:
            _i2++;
            _context2.next = 38;
            break;

          case 52:
            return _context2.abrupt("return");

          case 53:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, null, [[29, 34], [41, 46]]);
  }));

  return function (_x2, _x3) {
    return _ref13.apply(this, arguments);
  };
}();