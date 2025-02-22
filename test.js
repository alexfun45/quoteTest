let q = [1, 2, 3, 4, 5, 6, 7];
let buttons = [];

for(let k = 0, x = 0, y = 0;k < q.length; k++){
    y = k % 2;
    if(y === 0)
      x++;
    if(typeof buttons[x-1] !== 'object'){
      buttons[x-1] = [];
    }
    console.log(`(${x-1}, ${y})`);
    buttons[x-1][y] = ({text: k+1, callback_data: k + 1});
    console.log('buttons', buttons);
  }

