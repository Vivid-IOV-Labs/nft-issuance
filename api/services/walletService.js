require('dotenv').config();
const lib = require('xrpl-accountlib');
const xrpl = require('xrpl');

const generate = async () => {
    const wallet = lib.generate.familySeed();

    const walletAttributes = {
        publicAddress: wallet.address,
        privateSeed: wallet.secret.familySeed
    }
    //const walletRecord = await sails.models.wallet.create(walletAttributes).fetch().decrypt()
    const walletRecord = await sails.models.wallet.create(walletAttributes).fetch()

    return walletRecord
}

const fund = async (publicAddress) => {
    // const wallet = await sails.models.wallet.findOne({ publicAddress }).decrypt()
    const wallet = await sails.models.wallet.findOne({ publicAddress })
    
    const tempWallet = xrpl.Wallet.fromSeed(wallet.privateSeed)
    const client = await xrplService.connect()
    //const fundResult = await client.fundWallet(tempWallet)
    await client.fundWallet(tempWallet)
    client.disconnect()

    //updateBalance(publicAddress, fundResult.balance)
}

module.exports = {
    generate,
    fund
}