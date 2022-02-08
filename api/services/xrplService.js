const xrpl = require('xrpl')

require('dotenv').config();

module.exports = {
    connect: async () => {
        const server = (process.env.XRPL_NETWORK).toString()
        const client = new xrpl.Client(server)
        
        await client.connect()

        return client
    },
};