import Az from 'az'

export default async function getMorph(){
    return new Promise (resolve => Az.Morph.init('./node_modules/az/dicts', function() {
      //console.log('библиотека загружена');
      resolve(Az.Morph);
    }))
  }