const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const fs = require('fs');
require('dotenv').config()

const bot = new Telegraf(process.env.BOT_TOKEN)
var cntrl = 0;

bot.start((ctx) => ctx.reply('Bot rodando'))

bot.hears(/^iniciar|Iniciar$/, (ctx) => {      
    ctx.reply('Qual a senha?')
    })

bot.hears(/^comandos|Comandos$/, async (ctx) => {  
    isAuth(ctx.chat.id).then((auth)=>{
        auth === true ? 
        ctx.reply('comandos: \n • frases - lista todas as frase cadastradas'+ '\n • excluir - menu de quais frases você quer excluir')
         : ctx.reply("Não autorizado")
     })  
})

bot.hears(/^frases|Frases$/, async (ctx) => {   
    isAuth(ctx.chat.id).then((res)=>{
        res === true ?   getPhrases(ctx) : ctx.reply("Não autorizado")
     }) 
})

 bot.hears(/^excluir|Excluir$/, (ctx) => {      
    isAuth(ctx.chat.id).then((res)=>{
        res === true ? deletePhrase(ctx) : ctx.reply("Não autorizado")
     }) 
})

bot.action(/^[0-9]*$/, ctx => {
    const index = ctx.update.callback_query.data;
    const id_message = ctx.update.callback_query.message.message_id;
   cntrl >= 1 ? deleteText(ctx, index,ctx.chat.id, id_message) : null;
    })

bot.on(message('text'),  (ctx) => {
  text = ctx.message.text;
         if(`${text}`.toLocaleLowerCase().includes('escutar') && ctx.chat.type === 'private'){ //verificar se o chat é o mesmo do bot
            getSaved().then((savedData)=>{
                if (savedData?.chat_id == ctx.chat.id){
                var saveText = text.slice(text.indexOf(":")+1, text.length).trim();
                var actualTexts = savedData?.texts ?? [];               
                actualTexts = Array.isArray(actualTexts) ? actualTexts : [] 
                  if(actualTexts.indexOf(saveText) === -1){               
                     actualTexts.push(saveText);
                    saveNewText('saved', null, ctx.chat.id, actualTexts).then((res)=>{ 
                        ctx.reply(`${"Escutando corrêspondencias para: "+saveText}`)
                        })
                  }
              }else {
                ctx.reply('sem acesso ao bot');
              }
            });
        }
        if(`${text}`.toLocaleLowerCase().includes('senha') && ctx.chat.type === 'private' ){
            const pass = text.slice(text.indexOf(":")+1, text.length).trim();                    
           if (pass === 'senha'){
            saveNewText('saved', null,ctx.chat.id).then(()=>{ 
                ctx.reply("Bot pronto")
             })
            }
        }
       verifyString(ctx.message.from.username,ctx.message.chat.title, text)
})

  async function isAuth(requestChatID){
    var savedData = await getSaved();
     if(savedData.chat_id == requestChatID){
       return true;
     } else {
       return false;
     }
   }
   
     async function deleteText(ctx, index, deleteChatID, message_id){
     var savedJson = await getSaved();
     if(deleteChatID == savedJson.chat_id){
       excludedText = savedJson.texts[index];
       savedJson.texts.splice(index, 1); 
        await saveNewText('saved', null,deleteChatID,  savedJson.texts, ctx);
         ctx.deleteMessage(message_id);
         ctx.reply("Excluído: "+excludedText);
         cntrl = 0;
     } 
   }
   
   async function deletePhrase(ctx){
       cntrl++;
       try {
       var options = await getText('saved') ?? [];
       var map = options.map((item, index)=> {
     return {text:item, callback_data: index}
      })
      if(map.length > 0){
        bot.telegram.sendMessage(ctx.chat.id, 'Quais mensagens deseja excluir?', {
           reply_markup: {
               inline_keyboard: [map]
           }
       })
      }
      else {
       ctx.reply("nenhuma frase/palavra cadastrada")
      }
       }
    catch(e){}
   }
   
    async function getPhrases(ctx){
       try {
           var actualTexts = await getText('saved');
           if (actualTexts.length > 0){  
             var result = 'Frases cadastradas:\n';
             actualTexts.forEach((element, index) => {
              result = result+'• '+ element+'\n';
               if(index+1 == actualTexts.length) 
               ctx.reply(result);
           });
           return true;
           }
         else {
           ctx.reply('nenhuma frase cadastrada')
           return false;
         }
      }
    catch(err) {}
    }
   
   async function getText(name){
      try {
           var data = await fs.readFileSync(`./${name}.json`);
         json = JSON.parse(data.toString());
         return  name === 'temp'? json.text : json.texts;
      }
    catch {  return name === 'saved'? [] :''; }
   }
   
   async function getSaved(){
       try {
            var data = await fs.readFileSync(`./saved.json`);
          json = JSON.parse(data.toString());
          return  json;
       }
     catch(err) { return {};  }
    }

async function verifyString(user, group, text){
    try {
        var savedTexts =await getText('saved') ?? [];
        var chat_id = await getChatId();
        if(savedTexts.includes(text.toLocaleLowerCase()) && group != undefined){
          if(chat_id != null)
           bot.telegram.sendMessage(chat_id, "@"+user+ " comentou "+text+ ' no grupo '+group);
         }
    }
 catch(err){
    console.log(err)
 }
}

async function getChatId(){
    try {
      var data = await fs.readFileSync(`./saved.json`);
      json = JSON.parse(data.toString());
      return json.chat_id;
    }
 catch(err) {
    return null;
 }
}

async function saveNewText(name, text,chat_id, texts){
    try {
 var data = {
        texts: name ==="saved"? texts: null,
        chat_id:chat_id
      }
   var jsonData = JSON.stringify(data);
    
await fs.writeFileSync(name+".json", jsonData, function(err) {
    if (err) {
        console.log(err);
    }
    return true;
});
    }
  catch(err){
    console.log(err)
    return false;
  }
}

bot.launch()
