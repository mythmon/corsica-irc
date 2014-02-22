/* Description:
 *   Connects to IRC
 *
 * Dependencies:
 *   settings
 *
 * Configuration:
 *   server - The IRC server to connect to.
 *   channels - The channels to join.
 *   nick - The nick to use.
 *
 * Author:
 *    mythmon
 */

var irc = require('irc');

var logger = {
  log: console.log.bind(console, '[irc]'),
  warn: console.warn.bind(console, '[irc]'),
  error: console.error.bind(console, '[irc]'),
};

module.exports = function (corsica) {
  logger.log('Starting up');

  var settingsConfig = corsica.settings.setup('corsica-irc', {
    server: 'irc.example.org',
    port: 6667,
    channels: ['#bots'],
    nick: 'corsica',
  });

  var ircClient;
  var oldSettings;

  settingsConfig.get().then(function (settings) {
    if (typeof settings.channels === 'string') {
      settings.channels = [settings.channels];
      settingsConfig.set(settings);
    }

    oldSettings = settings;

    ircClient = new irc.Client(settings.server, settings.nick, {
      channels: settings.channels,
      port: settings.port,
    });

    ircClient.addListener('registered', function (message) {
      logger.log('Connected to server.');
    });

    ircClient.addListener('message', function (from, to, message) {
      settingsConfig.get().then(function (settings) {
        var regex = new RegExp('^' + settings.nick + ': (.*)$');
        var match = regex.exec(message);

        if (match === null) {
          return;
        }

        corsica.sendMessage('command', {raw: match[1]});
      });
    });

    ircClient.addListener('error', function(message) {
      logger.error('Something has gone wrong.');
      logger.error(message.stack || message);
    });
  })
  .catch(function (err) {
    logger.error('Something has gone wrong.');
    logger.error(err.stack || err);
  });

  settingsConfig.on('updated', function(newSettings) {
    logger.log('Settings updated');
    if (ircClient === undefined) {
      return;
    }
    // Server and/or Port
    if (newSettings.server !== oldSettings.server || newSettings.port !== oldSettings.port) {
      logger.log('Changing servers to:', newSettings.server + ':' + newSettings.port);
      ircClient.disconnect(function() {
        ircClient.opt = corsica.utils.merge(ircClient.opt, newSettings);
        ircClient.connect();
      });
      return;
    }

    // Nick
    if (newSettings.nick !== oldSettings.nick) {
      logger.log('Changing nick to', newSettings.nick);
      ircClient.send('NICK', newSettings.nick);
      ircClient.opt.nick = newSettings.nick;
    }

    // Channels
    oldSettings.channels.forEach(function(oldChan) {
      if (newSettings.channels.indexOf(oldChan) === -1) {
        logger.log('Leaving', oldChan);
        ircClient.part(oldChan);
      }
    });
    newSettings.channels.forEach(function(newChan) {
      if (oldSettings.channels.indexOf(newChan) === -1) {
        logger.log('Joining', newChan);
        ircClient.join(newChan);
      }
    });
  });
};
