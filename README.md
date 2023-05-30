# one-message-every-day
A discord bot that limits messages to once per day in a channel

## Self hosting
The bot uses Node.js 16+ internally, and includes a docker file for easy self-hosting in a container.

The instructions to self-host assume you are using a Linux virtual machine.  You can obtain a free one via [Google Cloud](https://cloud.google.com/free).
- Install docker for your platform.
- Clone the repository via GitHub desktop or git.
- Create a .env file which includes TOKEN=YOUR_DISCORD_TOKEN_HERE (replace YOUR_DISCORD_TOKEN_HERE with your discord bot token).
- Run `sudo docker compose up -d --build` (assuming your operating system is Linux).

## Configuring the bot in your server
Any channel you want this bot to manage, the bot must be given the "Manage Permissions" permission on that channel explicitly.  Additionally, the description of the channel should be `This channel enforces a cooldown of 24 hours between posts.` and nothing else.  The bot will update the channel description dynamically when it adds or removes a cooldown.