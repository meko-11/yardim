const Discord = require("discord.js");
const db = require("quick.db");
const config = require("./config.json");
const table = new db.table("Tickets");

// declare the client
const client = new Discord.Client();

// do something when the bot is logged in
client.on("ready", () => {
  console.log(`${client.user.tag} Başarıyla Giriş Yaptı.`)
  console.log(`Sunucu ID: ${config.guild}\nLog Kanalı ID: ${config.log}\nPrefix: ${config.prefix}`)
})

 client.on("message", async message => {

   if(message.channel.type === "dm"){
    const dbTable = new db.table("Tickets");
    if(message.author.bot) return;
    if(message.content.includes("@everyone") || message.content.includes("@here")) return message.author.send("Üzgünüm Burada everyone/here Kullanamassın.")
    let active = await dbTable.get(`support_${message.author.id}`)
    let guild = client.guilds.cache.get(config.guild);
    let channel, found = true;
    let user = await dbTable.get(`isBlocked${message.author.id}`);
    if(user === true || user === "true") return message.react("❌");
    if(active === null){
      active = {};
      let everyone = guild.roles.cache.get(guild.roles.everyone.id);
      let bot = guild.roles.cache.get(config.roles.bot);
      await dbTable.add("ticket", 1)
      let actualticket = await dbTable.get("ticket");
      channel = await guild.channels.create(`${message.author.username}-${message.author.discriminator}`, { type: 'text', reason: `Yeni Aspect Yardım Ticketi: #${actualticket}.` });
      channel.setParent(config.ticketCategory);
      channel.setTopic(`#${actualticket} | Bu Bileti Kapatmak İçin${config.prefix}kapat Yaz | ${message.author.username}'ın Ticketi`)
      const moderators = ["842843964993830962"]; // array
      moderators.forEach(moderator => {
      	let modrole = guild.roles.cache.get(config.roles.mod);
      	if(!modrole){
      		console.warn("Bu rolü getiremedim. Bu doğru rol kimliği mi?")
      	} else {
		    channel.createOverwrite(modrole, {
		      VIEW_CHANNEL: true,
		      SEND_MESSAGES: true,
		      READ_MESSAGE_HISTORY: true
		    });
      	}
      })
      channel.createOverwrite(everyone, {
        VIEW_CHANNEL: false
      });
      channel.createOverwrite(bot, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: true,
        READ_MESSAGE_HISTORY: true,
        MANAGE_MESSAGES: true
      })
      let author = message.author;
      const newTicket = new Discord.MessageEmbed()
		.setColor("GREEN")
		.setAuthor(author.tag, author.avatarURL({dynamic: true}))
		.setTitle(`Ticket #${actualticket}`)
		.addField("Channel", `<#${channel.id}>`, true)
      let supportServer = client.guilds.cache.get(config.guild);
      if(config.logs){
		try {
			supportServer.channels.cache.get(config.log).send({embed: newTicket})
		} catch(e) {
			if(e) supportServer.channels.cache.get(config.log).send(`Ticket #${actualticket} ${author.tag} Tarafından Oluşturuldu.`)
		}
      }
      const newChannel = new Discord.MessageEmbed()
        .setColor("BLUE").setAuthor(author.tag, author.avatarURL())
        .setDescription(`Ticket #${actualticket} Oluşturuldu.\nÜye: ${author}\nID: ${author.id}`)
        .setTimestamp()
      try {
      	supportServer.channels.cache.get(channel.id).send({embed:newChannel});
      } catch(e) {
      	supportServer.channels.cache.get(channel.id).send(`Bu Ticket ${author.tag} tarafından Oluşturuldu.`)
      }
      message.author.send(`Destek ekibiyle iletişime geçtiğiniz için teşekkür ederiz! Size hızlı bir şekilde geri döneceğiz. \n Sizin ticket numaranız: #${actualticket}.`)
      active.channelID = channel.id;
      active.targetID = author.id;
    }
    channel = client.channels.cache.get(active.channelID);
    var msg = message.content;
    var isPaused = await dbTable.get(`suspended${message.author.id}`);
    var isBlocked = await dbTable.get(`isBlocked${message.author.id}`);
    if(isPaused === true){
    	return message.channel.send("Maalesef ticketiniz şu anda duraklatılmış durumda. Destek ekibi devam ettirdiğinde size mesaj göndereceğim.")
    }
    if(isBlocked === true) return; // the user is blocked, so we're just gonna move on.
    if(message.attachments.size > 0){
      let attachment = new Discord.MessageAttachment(message.attachments.first().url)
      try {
      	client.channels.cache.get(active.channelID).send(`${message.author.username} > ${msg}`, {files: [message.attachments.first().url]})
  	  } catch(e) {
  	if(e) client.guilds.cache.get(config.guild).channels.cache.get(active.channelID).send(`${message.author.username} > ${msg}`, {files: [message.attachments.first().url]})
  	  }
    } else {
    	try {
    		client.guilds.cache.get(config.guild).channels.cache.get(active.channelID).send(`${message.author.username} > ${msg}`);
    	} catch(e) {
    		if(e) client.guilds.cache.get(config.guild).channels.cache.get(active.channelID).send(`${message.author.username} > ${msg}`)
    	}
    }
    await dbTable.set(`support_${message.author.id}`, active);
    await dbTable.set(`supportChannel_${active.channelID}`, message.author.id);
    return;
  }
  if(message.author.bot) return;
  var table = new db.table("Tickets");
  var support = await table.get(`supportChannel_${message.channel.id}`);
  if(support){
    var support = await table.get(`support_${support}`);
    let supportUser = client.users.cache.get(support.targetID);
    if(!supportUser) return message.channel.delete();
    
    // cevap
    if(message.content.startsWith(`${config.prefix}cevap`)){
      var isPause = await table.get(`suspended${support.targetID}`);
      let isBlock = await table.get(`isBlocked${support.targetID}`);
      if(isPause === true) return message.channel.send("Bu bilet zaten duraklatılmış.")
      if(isBlock === true) return message.channel.send("Kullanıcı engellendi. Destek talebine devam etmek veya kapatmak için engellerini kaldırın.")
      var args = message.content.split(" ").slice(1)
      let msg = args.join(" ");
      message.react("✅");
      if(message.attachments.size > 0){
        let attachment = new Discord.MessageAttachment(message.attachments.first().url)
        return supportUser.send(`${message.author.username} > ${msg}`, {files: [message.attachments.first().url]})
      } else {
        return supportUser.send(`${message.author.username} > ${msg}`);
      }
    };
    
    // gizli cevap
    if(message.content.startsWith(`${config.prefix}acevap`)){
      var isPause = await table.get(`suspended${support.targetID}`);
      let isBlock = await table.get(`isBlocked${support.targetID}`);
      if(isPause === true) return message.channel.send("Bu bilet zaten duraklatılmış.")
      if(isBlock === true) return message.channel.send("Kullanıcı engellendi. Destek talebine devam etmek veya kapatmak için engellerini kaldırın.")
      var args = message.content.split(" ").slice(1)
      let msg = args.join(" ");
      message.react("✅");
      return supportUser.send(`(Aspect Helper Team) ${msg}`);
    };
    
    // kullanıcı id
    if(message.content === `${config.prefix}id`){
      return message.channel.send(`Kullanıcının ID'si **${support.targetID}**.`);
    };
    
    // durdur
    if(message.content === `${config.prefix}durdur`){
      var isPause = await table.get(`suspended${support.targetID}`);
      if(isPause === true || isPause === "true") return message.channel.send("Bu bilet zaten duraklatılmış.")
      await table.set(`suspended${support.targetID}`, true);
      var suspend = new Discord.MessageEmbed()
      .setDescription(`⏸️ Bu Ticket **Kapandı** Ve **Askıya Alındı**. İptal Etmek İçin \`${config.prefix}devam\` Yaz.`)
      .setTimestamp()
      .setColor("YELLOW")
      message.channel.send({embed: suspend});
      return client.users.cache.get(support.targetID).send("Biletiniz duraklatıldı. Devam etmeye hazır olduğumuzda size bir mesaj göndereceğiz.")
    };
    
    // devam
    if(message.content === `${config.prefix}devam`){
      var isPause = await table.get(`suspended${support.targetID}`);
      if(isPause === null || isPause === false) return message.channel.send("Bu bilet duraklatılmadı.");
      await table.delete(`suspended${support.targetID}`);
      var c = new Discord.MessageEmbed()
      .setDescription("▶️ Bu ticketin kilidi **açıldı**.")
      .setColor("BLUE").setTimestamp()
      message.channel.send({embed: c});
      return client.users.cache.get(support.targetID).send("Selam ! Devam etmeye hazırız!");
    }
    
    // yasakla
    if(message.content.startsWith(`${config.prefix}block`)){
    var args = message.content.split(" ").slice(1)
	  let reason = args.join(" ");
	  if(!reason) reason = `Unspecified.`
	  let user = client.users.fetch(`${support.targetID}`); // djs want a string here
	  const blocked = new Discord.MessageEmbed()
		.setColor("RED").setAuthor(user.tag)
		.setTitle("User blocked")
		.addField("Channel", `<#${message.channel.id}>`, true)
		.addField("Reason", reason, true)
	  if(config.logs){
	    client.channels.cache.get(config.log).send({embed: blocked})
	  }
      let isBlock = await table.get(`isBlocked${support.targetID}`);
      if(isBlock === true) return message.channel.send("Kullanıcı zaten engellendi.")
      await table.set(`isBlocked${support.targetID}`, true);
      var c = new Discord.MessageEmbed()
      .setDescription("⏸️ Kullanıcının Aspect yardım'a erişimi engellenmiştir. Şimdi devam etmek için bileti kapatabilir veya engelini kaldırabilirsiniz.")
      .setColor("RED").setTimestamp()
      message.channel.send({embed: c});
      return;
    }
    
    // kapat
    if(message.content.toLowerCase() === `${config.prefix}kapat`){
        var embed = new Discord.MessageEmbed()
        .setDescription(`Bu Bilet **10** Saniye İçinde Kapanacak...`)
        .setColor("RED").setTimestamp()
        message.channel.send({embed: embed})
        var timeout = 10000
        setTimeout(() => {end(support.targetID);}, timeout)
      }
      async function end(userID){
        table.delete(`support_${userID}`);
        let actualticket = await table.get("ticket");
        message.channel.delete()
        return client.users.cache.get(support.targetID).send(`Bizimle iletişime geçtiğiniz için teşekkür ederiz. Yeni bir bilet açmak isterseniz, bana mesaj atmaktan çekinmeyin.\n#${actualticket} numaralı ticketiniz kapatıldı.`)
      }
    };
})

client.on("message", async message => {
  if(message.content.startsWith(`${config.prefix}unblock`)){
    if(message.guild.member(message.author).roles.cache.has(config.roles.mod)){
      var args = message.content.split(" ").slice(1);
      client.users.fetch(`${args[0]}`).then(async user => {
      	let data = await table.get(`isBlocked${args[0]}`);
        if(data === true){
          await table.delete(`isBlocked${args[0]}`);
                return message.channel.send(`Başarıyla ${user.username}'in Yasağı Aspect Yardım Servisinden Kaldırıldı Kullanıcı ID: (${user.id}) .`);
        } else {
          return message.channel.send(`${user.username} (${user.id}) şu anda Aspect Yardım tarafından engellenmektedir.`)
        }
            }).catch(err => {
              if(err) return message.channel.send("Bilinmeyen Kullanıcı.");
            })
    } else {
      return message.channel.send("Bunu Yapamazsın.");
    }
  }
})

//sesli aktif
client.on("ready", () => {
  client.channels.cache.get("842869999567241216").join();   
})
/*
   just in case:
   the token should not be here.
   the token should be in the 1st line of the process.env file instead.
*/
client.login(process.env.TOKEN); // Log the bot in


//durum 
client.on('ready', async () => {
console.log('Bot başarıyla giriş yaptı!')
client.user.setStatus("dnd");
client.user.setActivity(`Yardım İçin Bana Bir Mesaj At!`);
});