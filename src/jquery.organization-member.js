/*
 * jquery.organization-member
 * https://github.com/chenming142/jquery.organization-member
 *
 * Copyright (c) 2014 chenming142
 * Licensed under the MIT license.
 */

(function($) {
  var instances = [];
  $.fn.orgmember = function(options) {
    var defaults = {
      treeUrl  : '',
      treeKeys : {name: '', idKey: '', pIdKey: ''},
      
      node     : null,
      nodeUrl  : '',
      nodeKeys : {key: '',name: '',value: ''},
      values   : []
    };
    var settings = $.extend(defaults, options);
    var instance = false;
    $(this).each(function() {
      var i = instances.length;
      if ($(this).data('data-orgmember') !== null) {
        instances[i] = new OrgMember(this, settings);
        $(this).data('data-orgmember', instances[i]);
      };
    });
    return $(this);
  };

  var OrgMember = function(selector, settings) {
    this.init(selector, settings);
  };

  OrgMember.prototype = {
    selector     : null,
    settings     : null,
    
    orgTree      : null,
    orgMultiSele : null,
    
    node         : null,
    selected     : [],
    
    constructor  : OrgMember,
    init: function(selector, settings) {
      this.settings = settings;
      this.selector = $(selector);

      var orgTreeEl = this.selector.find('ul'),
        orgMultiSeleEl = this.selector.find('select');
      var orgTreeHtml, orgMultiSeleHtml;

      orgTreeHtml = '<ul id="orgTree" class="ztree" style="border:1px soild #c0f;width:25%;display:inline-block;"></ul>';
      orgMultiSeleHtml = '<div style="display:inline-block;">' + "                  <select name='orgMultiSel[]' id='orgMultiSel' multiple='multiple' size='8'></select>" + '              </div>';
      if (!orgTreeEl.length) {
        this.selector.append(orgTreeHtml);
      }
      if (!orgMultiSeleEl.length) {
        this.selector.append(orgMultiSeleHtml);
      }

      this.initMultiSele();
      this.initTree();
    },
    initTree: function() {
      var self = this,
        selector = self.selector;
      var settings, curNodeId;

      settings = self.settings;
      var keys = settings['treeKeys'],
        name, idKey, pIdKey;
      name = keys['name'], idKey = keys['idKey'], pIdKey = keys['pIdKey'];

      curNodeId = settings.curNodeId;
      self.node = self.data_format(settings.node);

      var nodeKeys = settings.nodeKeys;
      var values = settings.values;

      var treeJSON = self.getTreeJSON(settings);

      $.each(treeJSON, function(k, v) {
        if (v[pIdKey] == 0) {
          v['open'] = true;
        }
        if (curNodeId && v[idKey] == curNodeId) {
          v['open'] = true;
        }

        var nodes = self.node[v[idKey]];
        if (nodes && nodes.length) {
          v[name] = "[" + nodes.length + "]" + v[name];
        } else {
          v[name] = "[0]" + v[name];
        }

        if (nodes && nodes.length && values && values.length) {
          $.each(nodes, function(i, node) {
            $.each(values, function(i, value) {
              if (node[nodeKeys['value']] === value) {
                if (self.selected.indexOf(v[idKey]) == -1) {
                  self.selected.push(v[idKey]);
                }
                node['selected'] = true;
              }
            })
          })
        }
      });
      //console.log(JSON.stringify(self.selected));
      var orgTree = self.orgTree = $.fn.zTree.init(self.selector.find('ul'), {
        view: {
          dblClickExpand: false,
          showLine: false
        },
        check: {
          enable: true,
          chkStyle: "checkbox",
          chkboxType: {
            "Y": "",
            "N": ""
          }
        },
        data: {
          key: {
            name: name
          },
          simpleData: {
            enable : true,
            idKey  : idKey,
            pIdKey : pIdKey
          }
        },
        callback: {
          onClick: function(event, treeId, treeNode) {
            var nodes = [];
            orgTree.getNodesByFilter(function(node) {
              nodes.push(node);
            }, false, treeNode);

            orgTree.checkNode(treeNode, !treeNode.checked, true, true);

            $.each(nodes, function(i, node) {
              orgTree.checkNode(node, !node.checked, true, true);
            });
          },
          beforeCheck: function(treeId, treeNode) {
            var nodeId = treeNode[idKey];
            var json = self.node[nodeId];
            //console.log(JSON.stringify(json));
            var name = nodeKeys['name'];
            var value = nodeKeys['value'];

            if (json && json.length) {
              var operate = !treeNode.checked ? 'addOption' : 'removeOption';
              for (var i = 0; i < json.length; i++) {
                self.orgMultiSele.multiselect2side(operate, {
                  'name'     : json[i][name],
                  'value'    : json[i][value],
                  'selected' : json[i]['selected']
                });
              }
            }
          }
        }
      }, treeJSON);

      var node = orgTree.getNodeByParam(idKey, curNodeId, null);
      orgTree.selectNode(node);

      var nodes = orgTree.transformToArray(orgTree.getNodes());
      var selected = self.selected;
      //console.log(JSON.stringify(nodes));
      $.each(nodes, function(n, node) {
        $.each(selected, function(i, sele) {
          if (node[idKey] == sele) {
            if (node.isParent) {
              orgTree.expandNode(node, true, false, true);
            } else {
              orgTree.expandNode(node.getParentNode(), true, false, true);
            }
            orgTree.checkNode(node, !node.checked, true, true);
          }
        });
      });
    },
    initMultiSele: function() {
      var self = this,
        selector = self.selector;
      self.orgMultiSele = selector.find('select').multiselect2side({
        selectedPosition  : 'right',
        moveOptions       : false,
        labelsx           : '',
        labeldx           : '',
        minSize           : 23,
        autoSort          : true,
        autoSortAvailable : true
      });
    },
    getTreeJSON : function(settings){
      var json;
      if(settings.treeUrl){
        $.ajax({
          type: "POST",
          url: settings.treeUrl,
          cache: false,
          async: false,
          success: function(data) {
            json = $.parseJSON(data) || [];
          }
        });
        return json;
      }else{
        return settings.tree;
      }
    },
    data_format: function(data) {
      var self = this,
        result = {};
      var settings = self.settings,
        nodeKeys = settings['nodeKeys'];

      if (data.length > 0) {
        $.each(data, function(i, n) {
          var json = {}, key;
          key = n[nodeKeys['key']];

          json[nodeKeys['name']] = n[nodeKeys['name']];
          json[nodeKeys['value']] = n[nodeKeys['value']];

          result[key] = result[key] || [];
          result[key].push(json);
        });
      }
      //console.log(JSON.stringify(result));
      return result;
    }
  };
})(jQuery);

$(function() {
  var orgMember = $('#orgmember').orgmember({
    tree : jsonData,
    treeKeys: {
      name   : 'NAME',
      idKey  : 'ID',
      pIdKey : 'PID'
    },

    node: nodeData,
    nodeKeys: {
      key: 'DEPT_ID',
      name: 'MGR_NAME',
      value: 'USER_ID'
    },

    values: [
      '7e47049188e6463f8d248a2aa14c72fb',
      'a8a13ad310b34e998aeff2649b2f4e2e',
      '9cbe0162cfb64724b9003bffb2e9fa0e'
    ]
  });

  $('#getValues').click(function() {
    var result = orgMember.data('data-orgmember').orgMultiSele.multiselect2side('getValues');
    var str_ret = JSON.stringify(result);
    alert &&  alert(str_ret) || console.log(str_ret) ;
  });
});