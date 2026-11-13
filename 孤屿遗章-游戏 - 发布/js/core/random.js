/* 玩法随机的单一端口。正式运行仍逐次读取 Math.random，不固定种子或改变分布。 */
const GameRandom = (() => {
  function create({random=()=>Math.random()}={}) {
    const next=()=>random();
    return Object.freeze({random:next,rnd:(a,b)=>Math.floor(next()*(b-a+1))+a,chance:p=>next()<p,pick:arr=>arr[Math.floor(next()*arr.length)]});
  }
  return Object.freeze({create});
})();
