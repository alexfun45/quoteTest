import TelegramBot from 'node-telegram-bot-api'
import  'dotenv/config'
import Quotes from './Quotes.js'
import {getDBInstance} from './libs/db.js'
import fs from'fs'

let currentPage = 0,
    results = [],
    prevMsgs = [],
    msg_select = null,
    prev_button = null;

const ADOdb = getDBInstance();
const bot = new TelegramBot(process.env.BOT_TOKEN, 
    {
      polling: true
    }
  );

function getQuotes(){
  return (Quotes.length>currentPage) ? Quotes[currentPage++] : null;
}

async function newQuotesBlock(msg){
  //console.log(currentPage);
   // получить следующую порцию цитат
  let quotes = getQuotes(); 
  if(msg_select!==null){
    await bot.deleteMessage(msg_select.chat.id, msg_select.message_id);
    
    msg_select = null;
  }
  if(prevMsgs.length>0){
    //for(let i=0;i<prevMsgs.length;i++)
      //await bot.deleteMessage(prevMsgs[i].chat.id, prevMsgs[i].message_id);
    //console.log('chat id', prevMsgs[0].chat.id);
    //console.log('msgs', );
    let msgs = prevMsgs.map((item)=>item.message_id);
    //console.log('msgs', msgs);
    await bot.deleteMessages(prevMsgs[0].chat.id, msgs);
    prevMsgs = [];
  }
  
  // если цитат больше нет, то вернуть false
  if(quotes===null) return false;
  for(let i=0; i<quotes.length;i++)
    prevMsgs[i] = await bot.sendMessage(msg.chat.id, `${(i+1)}. ${quotes[i].text}`);
  let buttons = [];
  for(let k = 0,x = 0, y = 0;k<quotes.length; k++){
    y = k % 3;
    if(y === 0)
      x++;
    if(typeof buttons[x-1] !== 'object')
        buttons[x-1] = [];
    buttons[x-1][y] = ({text: k+1, callback_data: k});
  }
  
  if(currentPage>1)
    buttons.push([
      {text: '< вернуться назад', callback_data: 'back'}
    ])
  msg_select = await bot.sendMessage(msg.chat.id, 'Ваш выбор:', {
    reply_markup: {
      inline_keyboard: buttons
    },
  });
  
  return true;
}


bot.onText(/\/start/, async msg => {
  try{
    //newQuotesBlock(msg);
    prev_button = await bot.sendMessage(msg.chat.id, `Предлагаю вам пройти интересный тест.\n Каждый раз вам будет предложено выбрать цитату, которая вам понравится больше всего.\nВсе цитаты принадлежат ученым, писателям, политикам и художникам.\nКаждый блок цитат сгруппирован вокруг единой темы и вам требуется выбрать только одну.`, {
      reply_markup: {
        inline_keyboard: [
          [{
            text: 'Начать', callback_data: 'start_test'
          }]
        ]
      }}
      );
  } catch(e){
    console.log(e);
  }
});

const resTitle = [
  "Из цитат, посвященных темe смысла жизни, вы выбрали писателя направления ",
  "Из цитат, посвященных темe смысла жизни, вы выбрали писателя направления ",
  "Из цитат, посвященных теме власти, вы выбрали ",
  "Из цитат, посвященных теме Бога, вы выбрали ",
  "Из цитат, посвященных теме Бога, вы выбрали ",
  "Из цитат, посвященных теме красоты, вы выбрали художника направления ",
  "Цитаты на тему любви",
];

async function showResults(msg){
  await bot.sendMessage(msg.chat.id, 'Результаты теста:');
  for(let i=0;i<results.length;i++){
    let img_path = './img/'+results[i].img;
    let title = resTitle[i] + " " + results[i].subject + ". Автор цитаты: " + results[i].author;
    await bot.sendMessage(msg.chat.id, title);
    if (fs.existsSync(img_path)) {
      await bot.sendPhoto(msg.chat.id, img_path);
    }
  }
  //console.log('results', results);
}

bot.on('callback_query', async msg => {
  var data = msg.data,
      chat = (msg.hasOwnProperty('chat')) ? msg : msg.message;
  if(data=='start_test'){
    await bot.deleteMessage(chat.chat.id, prev_button.message_id);
    await newQuotesBlock(chat);
    return;
  }
  if(data === 'back'){
    currentPage-=2;
    await newQuotesBlock(chat);
  }
  else if(currentPage>0){
    results[currentPage-1] = Quotes[currentPage-1][data];
    const res = await newQuotesBlock(chat);
    // test end
    if(!res){
      let json_res = JSON.stringify(results),
          current_time = Date.now();
      let member = await bot.getChatMember(msg.message.chat.id, msg.message.chat.id);
      ADOdb.query(`INSERT INTO results(username, first_name, time, data) VALUES('${member.user.username}','${member.user.first_name}', '${current_time}', '${json_res}')`, 'run');
      await showResults(chat);
      currentPage = 0;
      results = [];
      prevMsgs = [],
      msg_select = null,
      prev_button = null;
    }
  }
});