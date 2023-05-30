require("dotenv").config();

const { Client, Events, GatewayIntentBits } = require('discord.js');
const { vsprintf } = require("sprintf-js");

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

const channelTopicBaseText = "This channel enforces a cooldown of %1$s between posts.";
const channelCooldownInPlace = "You can post in the channel again at <t:%1$s:t>.";
const channelTopicRegex = /^This channel enforces a cooldown of (.*){1} between posts\./;
const channelCooldownRegex = /You can post in the channel again at <t\:(\d+)\:t>\.$/;
const onlyNumbers = /\d+/;

const cooldowns = {};

function expireCooldown(guildId, channelId, time) {
    // return a timer that will expire the cooldown
    return setTimeout(async () => {
        try {
            const channel = client.guilds.cache.get(guildId).channels.cache.get(channelId);
        
            await channel.permissionOverwrites.edit(guildId, { SendMessages: null });

            const newDescription = channel.topic.match(channelTopicRegex)[0];

            await channel.setTopic(newDescription);

            delete cooldowns[channelId];
        } catch (err) {
            console.log(`Error expiring timeout: ${err}`);
        }
    }, time);
}

/**
 * 
 * @param {import('discord.js').Channel} channel 
 */
async function applyCooldown(channel, startup) {
    try {
        // check the channel description to see if a cooldown should be enforced
        const description = channel.topic;

        if (!description) return;

        const hasCooldownTime = description.match(channelTopicRegex);

        if (!hasCooldownTime) return;

        const [_, cooldownTime] = hasCooldownTime;

        if (cooldownTime) {
            // check if cooldown is in place already
            // everyone cannot send message + channel text says it's enforced
            const hasUntilTime = description.match(channelCooldownRegex);

            if (hasUntilTime) {
                let [_, untilTime] = hasUntilTime;

                if (untilTime) {
                    // enforce the cooldown and exit
                    // untilTime is in seconds, not milliseconds
                    const time = parseInt(untilTime);
                    untilTime = time * 1000;

                    if (untilTime < new Date().valueOf()) {
                        // the time already expired
                        cooldowns[channel.id] = expireCooldown(channel.guildId, channel.id, 0);
                        return;
                    }
    
                    await channel.permissionOverwrites.edit(channel.guildId, { SendMessages: false });
    
                    if (cooldowns[channel.id]) {
                        clearTimeout(cooldowns[channel.id]);
                        delete cooldowns[channel.id];
                    }

                    const remainingTime = time - new Date().valueOf();
    
                    cooldowns[channel.id] = expireCooldown(channel.guildId, channel.id, remainingTime);
            
                    // set the channel description
                    const newDescription = vsprintf(channelTopicBaseText, [cooldownTime]) + " " + vsprintf(channelCooldownInPlace, [time]);
                    await channel.setTopic(newDescription);
    
                    return;
                }
            }

            if (startup) return;

            // determine how long the cooldown is for
            const numbers = parseInt(cooldownTime.match(onlyNumbers)[0]);
            const multiplier = 
                cooldownTime.indexOf("days") > -1 || cooldownTime.indexOf("day") > -1
                ? 1000 * 60 * 60 * 24 : 
                // assume hours
                1000 * 60 * 60;

            // if a cooldown should be enforced, block the channel for the amount of time specified in the description
            const time = numbers * multiplier;

            await channel.permissionOverwrites.edit(channel.guildId, { SendMessages: false });
            
            if (cooldowns[channel.id]) {
                clearTimeout(cooldowns[channel.id]);
                delete cooldowns[channel.id];
            }

            cooldowns[channel.id] = expireCooldown(channel.guildId, channel.id, time);

            // set the channel description
            const newDescription = vsprintf(channelTopicBaseText, [cooldownTime]) + " " + vsprintf(channelCooldownInPlace, [Math.round((time + new Date().valueOf()) / 1000)]);
            await channel.setTopic(newDescription);
        }
    } catch (err) {
        console.log(`Error applying cooldown: ${err}`);
    }
}

client.on(Events.ClientReady, async () => {
    console.log("Reading up...");

    try {
        // check each channel's description looking for channels that have a cooldown enforced
        // hydrate the channel cooldown timers
        for (let [_, guild] of client.guilds.cache) {
            for (let [_, channel] of guild.channels.cache) {
                await applyCooldown(channel, true);
            }
        }

        console.log("Ready!");
    } catch (err) {
        console.log(`Error hydrating guilds: ${err}`);
    }
});

client.on(Events.MessageCreate, async (message) => await applyCooldown(message.channel));

client.login(process.env.TOKEN);