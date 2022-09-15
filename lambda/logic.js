const moment = require('moment-timezone'); // will help us do all the birthday math
const translatation = [
    {english: "Alive", spanish: "Vivo"}, {english: "Dead", spanish: "Muerto"}, {english: "unknown", spanish: "Desaparecido"},
]


module.exports = {
     getRemoteData (url) {
      /*Use const url = "http://api.open-notify.org/astros.json"
        let speakOutput = "defecto";
        await logic.getRemoteData(url)
          .then((response) => {
            const data = JSON.parse(response);
            speakOutput = data.people.length.toString()
      })*/
      return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? require('https') : require('http');
        const request = client.get(url,(response) => {
          if (response.statusCode < 200 || response.statusCode > 299) {
            reject(new Error('Failed with status code: ' + response.statusCode));
          }
          const body = [];
          response.on('data', (chunk) => body.push(chunk));
          response.on('end', () => resolve(body.join('')));
        });
        request.on('error', (err) => reject(err))
      })
    },
    
    createReminderData(date, message, locale){
        moment.locale(locale);
        const now = moment().tz('America/Bogota');
        return {
            requestTime: now.format('YYYY-MM-DDTHH:mm:00.000'),
            trigger: {
                type: 'SCHEDULED_ABSOLUTE',
                scheduledTime: moment(date + " 08:30").format('YYYY-MM-DDTHH:mm:00.000'),
                timeZoneId: "America/Bogota",
            },
            alertInfo: {
              spokenInfo: {
                content: [{
                  locale: locale,
                  text: message,
                }],
              },
            },
            pushNotification: {
              status: 'ENABLED',
            }
        }
    },
    
    translate(status){
        return translatation.filter(dic => dic.english === status )[0].spanish;
    }
}