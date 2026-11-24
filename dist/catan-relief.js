/* Miniatures share the board's coordinate system so intersections remain tappable. */
const islandRelief = (() => {
  const surface = '0,-52 45,-26 45,26 0,52 -45,26 -45,-26';
  const base = ['#709557','#b67c50','#abc578','#d2ac56','#9a9985','#dcb97d'];
  const use = (id,x,y,scale=1) => '<use href="#rel-'+id+'" transform="translate('+x+' '+y+') scale('+scale+')"/>';
  const ridge = (x,y,size) => use('ridge',x,y,size);
  const tree = (x,y,size) => use('pine',x,y,size);
  const sheep = (x,y,size) => use('sheep',x,y,size);
  const hills = '<path d="M-38 -4Q-23 -31 -5 -14T36 -6Q14 4 -10 1Z" fill="#799256"/><path d="M-37 -5Q-20 -32 -5 -15Q-19 -20 -36 -3Z" fill="#c2d993"/>';
  const field = '<path d="M-38 -5l25 -22 39 10 -25 22z" fill="#a26b33"/>'+Array.from({length:8},(_,i)=>'<path d="M'+(-35+i*4.7)+' '+(-5+i*1.15)+'l24 -20" stroke="#f5d777" stroke-width="2.7"/>').join('');
  const scenes = [
    [[-21,-5,.8],[0,-13,1],[20,-6,.78],[-9,0,1.1],[11,4,.93]].map(v=>tree(...v)).join(''),
    '<g fill="#bd7246" stroke="#a05d3d" stroke-width="1.3"><path d="M-37 -7l9 -16 17 -4 10 12 15 -6 20 12 -7 10 -26 -1 -13 6z"/></g><path d="M-37 -7l14 -7 11 -13 -16 4zM-8 -14l7 -1 15 -6 -4 8 -11 4z" fill="#ebaa74"/><path d="M-23 -14l13 4 -2 12 -16 -6zM10 -13l24 4 -7 10 -19 -5z" fill="#945638"/>',
    hills+sheep(-18,-5,.9)+sheep(10,-10,.75)+sheep(22,1,.65),
    field,
    ridge(-16,-3,.83)+ridge(4,-8,1.05)+ridge(23,1,.70),
    '<path d="M-38 -3q19 -24 38 -15t37 9q-19 -4 -34 5t-41 1" fill="#eaca8c"/><path d="M-36 -2q20 -6 35 -15 -8 17 -35 15M3 -3q16 -13 34 -6 -17 1 -34 10" fill="#bb955e"/>'
  ];
  const shapes =
    '<g id="rel-pine"><ellipse cx="4" cy="2" rx="10" ry="3" fill="#294535" opacity=".33"/><path d="M-2 -8h4v10h-4z" fill="#70513b"/><path d="M0 -29l-8 13h4l-7 12 11 3 10 -3 -6 -12h3z" fill="#2d674b"/><path d="M0 -29l-8 13h4l-7 12 9 -1z" fill="#62a16c"/></g>'+
    '<g id="rel-ridge"><path d="M-21 1l12 -15 8 -17 11 12 12 20 -17 4z" fill="#83877e"/><path d="M-21 1l20 -32 -4 22 -6 5z" fill="#c3c6b5"/><path d="M-1 -31l11 12 12 20 -14 -7z" fill="#596a67"/><path d="M-9 -16l8 -15 8 9 -4 -1 -4 -2 -4 8z" fill="#e6e8d8"/></g>'+
    '<g id="rel-sheep"><ellipse cx="2" cy="2" rx="8" ry="2.7" fill="#678053"/><path d="M-4 -2v4m6 -4v4" stroke="#574a3a" stroke-width="2"/><ellipse cy="-4" rx="7" ry="4" fill="#fff0cc"/><ellipse cx="6" cy="-4" rx="2.7" ry="3.2" fill="#675a46"/></g>';
  const defs = '<defs>'+shapes+'<linearGradient id="rel-light" x2=".85" y2="1"><stop stop-color="#fff2bb" stop-opacity=".22"/><stop offset="1" stop-color="#253a2f" stop-opacity=".18"/></linearGradient>'+
    scenes.map((scene,i)=>'<g id="rel-tile'+i+'"><polygon points="'+surface+'" fill="'+base[i]+'"/><polygon points="'+surface+'" fill="url(#rel-light)" stroke="#fff2c4" stroke-opacity=".45"/>'+scene+'</g>').join('')+'</defs>';
  function tile(t,x,y,robbed,merchant,name,pirate) {
    if(t.res===-2)return '<g transform="translate('+x+' '+y+')"><polygon points="'+surface+'" fill="#387f84" stroke="#70a4a0" stroke-width=".7"/><path d="M-22 -5q6 -4 12 0t12 0m2 10q5 -3 10 0t10 0" fill="none" stroke="#8cbab4"/>'+(pirate?'<text fill="white">해적</text>':'')+'</g>';
    const kind=t.res===8?4:t.res<0?5:t.res;
    return '<g transform="translate('+x+' '+y+')"><path d="M-45 -26v56l45 26 45 -26v-56L0 0Z" fill="#654c34"/>'+use('tile'+kind,0,0)+
      (t.res===8?'<path d="M-16 -3l5 -6 6 3 -2 6zM5 -4l3 -7 7 4 -2 6z" fill="#ffd75e" stroke="#a27627"/>':'')+
      '<text y="8" fill="#fff9e4" stroke="#384031" stroke-width="3" paint-order="stroke" font-size="12">'+(merchant?'상인 · ':'')+name+'</text>'+
      (robbed||t.num?'<ellipse cy="27" rx="13" ry="12" fill="#78664c"/><ellipse cy="25" rx="13" ry="12" fill="'+(robbed?'#31433e':'#fff0c8')+'"/><text y="25" fill="'+(robbed?'white':[6,8].includes(t.num)?'#ad392c':'#283632')+'" font-size="'+(robbed?11:16)+'">'+(robbed?'도둑':t.num)+'</text>':'')+'</g>';
  }
  function building(x,y,owner,color,city){
    return '<g transform="translate('+x+' '+y+')"><ellipse cx="3" cy="5" rx="13" ry="5" fill="#25312b" opacity=".42"/><g fill="'+color+'" stroke="#30392f" stroke-width="1.4">'+(city?'<path d="M-12 -4l5 -6 5 3v-7l6 -5 7 5v16L2 7l-14 -4z"/>':'<path d="M-10 -4l7 -9 8 3 6 8v6L2 8l-12 -4z"/>')+'</g><path d="M2 -1l9 -4v9L2 8z" fill="#192b29" opacity=".34"/><text x="-2" y="0" fill="#172529" font-size="9">'+(owner+1)+'</text></g>';
  }
  return {defs,tile,building};
})();
