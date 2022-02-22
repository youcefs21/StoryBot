const fs = require('fs');
const { Client, Collection, Intents, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const wait = require('util').promisify(setTimeout);
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (interaction.isButton()) {
		await interaction.deferReply();
        const storyObj = JSON.parse(fs.readFileSync('./story/story.json', 'utf8'));
        const charObj = JSON.parse(fs.readFileSync('./story/chars.json', 'utf8'));
        let varsObj = JSON.parse(fs.readFileSync('./story/vars.json', 'utf8'));
        let pointer = interaction.customId;
        const userID = interaction.user.id;
        const channel = interaction.channel;


        const filter = m => m.author.id == userID;
		await interaction.editReply(storyObj[pointer].selected);
		const go = true;
		await wait(2000);
        while (go) {

            const charPointer = storyObj[pointer].cid;
            let waiting = false;
            if (storyObj[pointer].interaction.type === 'end') return;
            if (storyObj[pointer].interaction.type === 'prompt') {
                waiting = true;
                console.log('awaiting input');
                channel.awaitMessages({ filter, max: 1, time: 120_000, errors: ['time'] })
                .then(collected => {
                    console.log(collected.first().content);
                    varsObj[storyObj[pointer].interaction.variable] = collected.first().content;
                    waiting = false;
                    fs.writeFile('./story/vars.json', JSON.stringify(varsObj), function(err) {
                        if (err) throw err;
                    });
                })
                .catch((collected) => console.log(collected));
            }

            // text processing
            let text = storyObj[pointer].text;
            for (const property in varsObj) {
                text = text.replaceAll(property, varsObj[property]);
                charObj[charPointer].name = charObj[charPointer].name.replaceAll(property, varsObj[property]);
            }

            const textArray = text.split('||');
            let out = '';

            const storyEmbed = new MessageEmbed()
                .setColor(charObj[charPointer].color)
                .setDescription('')
                .setThumbnail(charObj[charPointer].pic)
                .setTimestamp()

            const messge = channel.send({ embeds: [storyEmbed] });

            await wait(1000);
            for (let i = 0;i < textArray.length;i++) {
                out += textArray[i];
                storyEmbed.setDescription(out);
                let done = false;
                messge.then(msg => {
                    msg.edit({ embeds: [storyEmbed] });
                    done = true;
                })
                .catch(console.error);
                while (!done) await wait(50);
                await wait(1000);
            }

            while (waiting) {
                await wait(500);
            }

            if (storyObj[pointer].interaction.type !== 'choice') {
                pointer = storyObj[pointer].interaction.pointer;
            }
            else {
                const rows = [];
                const labels = storyObj[pointer].interaction.labels;
                const pointers = storyObj[pointer].interaction.pointer;
                for (let i = 0; i < labels.length;i++) {
                    const row = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(pointers[i])
                            .setLabel(labels[i])
                            .setStyle('PRIMARY'),
                    );
                    rows.push(row);
                }
                messge.then(msg => {
                    msg.edit({ embeds: [storyEmbed], components: rows });
                })
                .catch(console.error);
                return;
            }
            await wait(2000);
        }
	}

	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	}
	catch (error) {
		console.error(error);
		return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});


// Login to Discord with your client's token
client.login(process.env.TOKEN);