[![npm version](https://badge.fury.io/js/slack-chat.svg)](http://badge.fury.io/js/slack-chat)
[![Dependency Status](https://david-dm.org/salimkayabasi/slack-chat.svg)](https://david-dm.org/salimkayabasi/slack-chat)
[![DevDependency Status](https://david-dm.org/salimkayabasi/slack-chat/dev-status.svg)](https://david-dm.org/salimkayabasi/slack-chat#info=devDependencies)
[![PeerDependency Status](https://david-dm.org/salimkayabasi/slack-chat/peer-status.svg)](https://david-dm.org/salimkayabasi/slack-chat#info=peerDependencies)
[![Build Status](https://travis-ci.org/salimkayabasi/slack-chat.svg?branch=master)](https://travis-ci.org/salimkayabasi/slack-chat)
[![Greenkeeper badge](https://badges.greenkeeper.io/salimkayabasi/slack-chat.svg)](https://greenkeeper.io/)

# slack-chat


Basic slack chat bot implementation

```$bash
yarn add slack-chat
```

```$js
import SlackChat from 'slack-chat';

const bot = new SlackChat({
    /* options */
    token, // slack bot token
    username, // username of your bot
    channel // channel name which message will be sent (#general is default channel)
  });
await bot.postMessage('your message');
```
