require('dotenv').config();
const lib = require('xrpl-accountlib');
const xrpl = require('xrpl');

const generate = async () => {
    const wallet = lib.generate.familySeed();

    const walletAttributes = {
        publicAddress: wallet.address,
        privateSeed: wallet.secret.familySeed
    }
    const walletRecord = await sails.models.wallet.create(walletAttributes).fetch().decrypt()

    return walletRecord
}

const fund = async (publicAddress) => {
    const wallet = await sails.models.wallet.findOne({ publicAddress }).decrypt()

    const tempWallet = xrpl.Wallet.fromSeed(wallet.privateSeed)
    const client = await xrplService.connect()
    await client.fundWallet(tempWallet)
    client.disconnect()

}

module.exports = {
    generate,
    fund
}