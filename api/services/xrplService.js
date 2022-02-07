const xrpl = require('xrpl')

require('dotenv').config();

module.exports = {
    connect: async () => {
        const testnetServer = 'wss://s.altnet.rippletest.net:51233'
        const server = testnetServer
        const client = new xrpl.Client(server)
        
        await client.connect()

        return client
    },
};