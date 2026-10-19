/* 增量DOM提交。模板只描述目标状态；已有图片、控件、滚动容器保留节点。 */
const StableDOM = (() => {
  const actionKeys=['data-view-key','data-satchelpick','data-satchel','data-item','data-warehouse-item','data-cellar-item','data-furniture','data-hotspot','data-building','data-arrow','data-invcat','data-player-panel','data-adbuy','data-equip','data-eqpick','data-unequip-slot','data-skill','data-node','data-recipe','data-craft','data-setting','data-nav','data-choice'];
  const eventProps=['onclick','onkeydown','onkeyup','oninput','onchange','onpointerdown','onpointermove','onpointerup','onpointercancel','oncontextmenu','onfocus','onblur'];
  function create({locale,onAdopt=()=>{},onDispose=()=>{}}={}) {
    const imageSources=new WeakMap();
    function remember(node){if(node.nodeType!==1)return;if(node.localName==='img')imageSources.set(node,node.getAttribute('src'));for(const child of node.children)remember(child);}
    function text(node,value){const raw=String(value??'');if(locale?.syncText)locale.syncText(node,raw);else if(node.textContent!==raw)node.textContent=raw;}
    function style(node,name,value){if(node.style[name]!==String(value))node.style[name]=value;}
    function key(node){if(node.nodeType!==1)return null;if(node.id)return node.localName+'#'+node.id;for(const attr of actionKeys)if(node.hasAttribute(attr))return node.localName+'|'+attr+'='+node.getAttribute(attr);return null;}
    function clean(node){if(node.nodeType!==1)return;onDispose(node);for(const child of node.children)clean(child);}
    function compatible(a,b){return a.nodeType===b.nodeType&&(a.nodeType!==1||a.localName===b.localName&&a.namespaceURI===b.namespaceURI);}
    function attribute(node,name,value){
      // onerror可能已换成备用图；模板来源没变时保留备用图，不反复请求坏图。
      if(node.localName==='img'&&name==='src'){const previous=imageSources.get(node);imageSources.set(node,value);if(previous===value)return;}
      if(locale?.syncAttribute&&['title','aria-label','placeholder','alt'].includes(name))locale.syncAttribute(node,name,value);
      else if(node.getAttribute(name)!==value)node.setAttribute(name,value);
    }
    function patch(node,next){
      if(node.nodeType===3){if(locale?.syncText)locale.syncText(node,next.nodeValue);else if(node.nodeValue!==next.nodeValue)node.nodeValue=next.nodeValue;return;}
      if(node.nodeType!==1)return;
      const previousValue=node.getAttribute('value');
      const previousText=node.localName==='textarea'?node.textContent:null;
      const selected=node.localName==='select'?JSON.stringify([...node.options].map(o=>[o.value,o.defaultSelected])):null;
      const targetSelection=node.localName==='select'?[...next.options].map(o=>o.selected):null;
      for(const attr of [...node.attributes])if(!next.hasAttribute(attr.name)&&!(node.localName==='details'&&attr.name==='open'))node.removeAttribute(attr.name);
      for(const attr of next.attributes)attribute(node,attr.name,attr.value);
      // 用户正在输入的数值不能被模板的相同默认值覆盖；受控值变化才同步。
      if(node.localName==='input'){
        if(node.type==='checkbox'||node.type==='radio')node.checked=next.checked;
        else if(previousValue!==next.getAttribute('value')&&node.value!==next.value)node.value=next.value;
      }
      for(const prop of eventProps)node[prop]=next[prop];
      onAdopt(node,next);
      children(node,next);
      if(node.localName==='textarea'&&previousText!==node.textContent)node.value=node.textContent;
      if(selected!==null&&selected!==JSON.stringify([...node.options].map(o=>[o.value,o.defaultSelected])))for(let i=0;i<node.options.length;i++)node.options[i].selected=!!targetSelection[i];
    }
    function children(parent,source){
      const old=[...parent.childNodes],used=new Set(),byKey=new Map();
      for(const node of old){const k=key(node);if(k){if(!byKey.has(k))byKey.set(k,[]);byKey.get(k).push(node);}}
      let cursor=parent.firstChild;
      for(const proposal of [...source.childNodes]){
        const k=key(proposal);let node;
        if(k)node=byKey.get(k)?.find(n=>!used.has(n)&&compatible(n,proposal));
        else if(cursor&&!used.has(cursor)&&!key(cursor)&&compatible(cursor,proposal))node=cursor;
        else node=old.find(n=>!used.has(n)&&!key(n)&&compatible(n,proposal));
        if(node){used.add(node);patch(node,proposal);}else{node=proposal;remember(node);locale?.translate?.(node);}
        if(node!==cursor)parent.insertBefore(node,cursor);
        cursor=node.nextSibling;
      }
      for(const node of old)if(!used.has(node)&&node.parentNode===parent){clean(node);node.remove();}
    }
    function html(parent,markup,prepare){const template=document.createElement('template');template.innerHTML=markup;prepare?.(template.content);children(parent,template.content);}
    return Object.freeze({html,reconcile:children,text,style,dispose:clean});
  }
  return Object.freeze({create});
})();
