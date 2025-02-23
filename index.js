import TelegramBot from 'node-telegram-bot-api'
import  'dotenv/config'
import Quotes from './Quotes.js'
import {getDBInstance} from './libs/db.js'
import fs from'fs'

(function(){
let userTests = {},
    //currentPage = 0,
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

function getQuotes(currentPage){
  return (Quotes.length>currentPage) ? Quotes[currentPage] : null;
}

async function deleteMessages(userTest){
  if(userTest.msg_select!==null){
    await bot.deleteMessage(userTest.msg_select.chat.id, userTest.msg_select.message_id);
    userTest.msg_select = null;
  }
  if(userTest.prevMsgs.length>0){
    let msgs = userTest.prevMsgs.map((item)=>item.message_id);
    //console.log('msgs', msgs);
    await bot.deleteMessages(userTest.prevMsgs[0].chat.id, msgs);
    userTest.prevMsgs = [];
  }
}

async function newQuotesBlock(msg){
  //console.log(currentPage);
   // получить следующую порцию цитат
  const userTest = userTests[msg.chat.id];
  const current = userTest.currentPage++;
  let quotes = getQuotes(current); 
  await deleteMessages(userTest);  
  // если цитат больше нет, то вернуть false
  if(quotes===null) return false;
  for(let i=0; i<quotes.length;i++)
    userTest.prevMsgs[i] = await bot.sendMessage(msg.chat.id, `${(i+1)}. ${quotes[i].text}`);
  let buttons = [];
  for(let k = 0,x = 0, y = 0;k<quotes.length; k++){
    y = k % 3;
    if(y === 0)
      x++;
    if(typeof buttons[x-1] !== 'object')
        buttons[x-1] = [];
    buttons[x-1][y] = ({text: k+1, callback_data: k});
  }
  
  if(userTest.currentPage>1)
    buttons.push([
      {text: '< вернуться назад', callback_data: 'back'}
    ])
    userTest.msg_select = await bot.sendMessage(msg.chat.id, 'Ваш выбор:', {
    reply_markup: {
      inline_keyboard: buttons
    },
  });
  
  return true;
}


bot.onText(/\/start/, async msg => {
  try{
    //newQuotesBlock(msg);
    const chatId = msg.chat.id;
    // Сброс состояния пользователя
    userTests[chatId] = {
      currentPage: 0,
      prevMsgs: [],
      msg_select: null,
      prev_button: null,
      results: []
  };
  await bot.setMyCommands([
    {
      command: "start",
      description: "Перезапуск бота"
    }
  ]);
  userTests[chatId].prev_button = await bot.sendMessage(msg.chat.id, `Предлагаю вам пройти интересный тест.\n Каждый раз вам будет предложено выбрать цитату, которая вам понравится больше всего.\nВсе цитаты принадлежат ученым, писателям, политикам и художникам.\nКаждый блок цитат сгруппирован вокруг единой темы и вам требуется выбрать только одну.`, {
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
  const userTest = userTests[msg.chat.id];
  await bot.sendMessage(msg.chat.id, 'Результаты теста:');
  for(let i=0;i<userTest.results.length;i++){
    let img_path = './img/'+userTest.results[i].img;
    let title = resTitle[i] + " " + userTest.results[i].subject + ". Автор цитаты: " + userTest.results[i].author;
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
  const chatId = chat.chat.id;
  //console.log('chat', chat);
  //console.log('chatId', chatId);
  if(userTests[chatId]){
    const userTest = userTests[chatId];
    if(data=='start_test'){
      await deleteMessages(userTest);
      /*if(userTest.prev_button){
        await bot.deleteMessage(chat.chat.id, userTest.prev_button.message_id);
        userTest.prev_button = null;
      }*/
      await newQuotesBlock(chat);
      return;
    }
    if(data === 'back'){
      userTest.currentPage-=2;
      await newQuotesBlock(chat);
    }
    else if(userTest.currentPage>0){
      userTest.results[userTest.currentPage-1] = Quotes[userTest.currentPage-1][data];
      const res = await newQuotesBlock(chat);
      // test end
      if(!res){
        let json_res = JSON.stringify(userTest.results),
            current_time = Date.now();
        let member = await bot.getChatMember(msg.message.chat.id, msg.message.chat.id);
        ADOdb.query(`INSERT INTO results(username, first_name, time, data) VALUES('${member.user.username}','${member.user.first_name}', '${current_time}', '${json_res}')`, 'run');
        await showResults(chat);
        //currentPage = 0;
        //results = [];
        //userTest.prevMsgs = [],
        //msg_select = null,
        //prev_button = null;
      }
    }
  }
});

})();