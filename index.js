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

module.exports = function (corsica) {
  console.log('[corsica irc] Starting up');

  var settingsConfig = corsica.settings.setup('corsica-irc', {
    server: 'irc.example.org',
    channels: ['#bots'],
    nick: 'corsica',
  });

  settingsConfig.get().then(function (settings) {
    var ircClient = new irc.Client(settings.server, settings.nick, {
      channels: settings.channels,
    });

    ircClient.addListener('registered', function (message) {
      console.log('[corsica irc] Connect to server.');
      settingsConfig.get()
        .then(function (settings) {
          settings.nick = message.args[0];
          settingsConfig.set(settings);
        });
    });

    ircClient.addListener('message', function (from, to, message) {
      settingsConfig.get().then(function (settings) {
        var regex = new RegExp('^' + settings.nick + ': (.*)$');
        var match = regex.exec(message);

        if (match === null) {
          return;
        }

        var split = match[1].split(' ');
        var url = split[0];
        var screen = split[1];
        // What if screen isn't specified? hmm...

        corsica.sendMessage('content', {
          screen: screen,
          type: 'url',
          url: url,
        });
      });
    });

    ircClient.addListener('error', function(message) {
      console.error('[corsica irc] Something has gone wrong.');
      console.error(message.stack || message);
    });
  })
  .catch(function (err) {
    console.error('[corsica irc] Something has gone wrong.');
    console.error(err.stack || err);
  });
};
