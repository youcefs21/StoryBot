const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const wait = require('util').promisify(setTimeout);
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('story')
        .setDescription('a great adventure awaits you'),
    async execute(interaction) {
        // check who used the command
        const userID = interaction.user.id;
        const channel = interaction.channel;
        // const client = interaction.client;
        const filter = m => m.author.id == userID;

        // initializing
        const storyObj = JSON.parse(fs.readFileSync('./story/story.json', 'utf8'));
        const charObj = JSON.parse(fs.readFileSync('./story/chars.json', 'utf8'));
        let varsObj = JSON.parse(fs.readFileSync('./story/vars.json', 'utf8'));
        let pointer = 'A0';


        const go = true;
        // to be looped
        // let messge = channel.send('test');
        await interaction.deferReply();
        await interaction.editReply('Here we go!');
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
	},
};