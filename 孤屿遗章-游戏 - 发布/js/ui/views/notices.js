/* notices：只读游戏查询并发送操作，拥有本功能的视图实现。 */
const NoticeView = (() => {
  function create(deps) {

function bindPress(...args){return deps.artView.bindPress(...args);}

function bindWarehouseCard(...args){return deps.artView.bindWarehouseCard(...args);}

function dragTransferQuantity(...args){return deps.artView.dragTransferQuantity(...args);}

function centerToast(...args){return deps.artView.centerToast(...args);}

function floatingNotice(...args){return deps.artView.floatingNotice(...args);}

function maybeBatchTip(...args){return deps.artView.maybeBatchTip(...args);}

function addLog(...args){return deps.artView.addLog(...args);}

function replayLog(...args){return deps.artView.replayLog(...args);}
    return Object.freeze({bindPress,bindWarehouseCard,dragTransferQuantity,centerToast,floatingNotice,maybeBatchTip,addLog,replayLog});
  }
  return Object.freeze({create});
})();
