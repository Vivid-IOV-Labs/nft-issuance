/**
 * NftController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

require('dotenv').config();

//Generate Wallets
const X_ISSUER_WALLET_ADDRESS = (process.env.X_ISSUER_WALLET_ADDRESS).toString();
const X_ISSUER_SEED = (process.env.X_ISSUER_SEED).toString();

const X_BRAND_WALLET_ADDRESS = (process.env.X_BRAND_WALLET_ADDRESS).toString();
const X_BRAND_SEED = (process.env.X_BRAND_SEED).toString();

const X_USER_WALLET_ADDRESS = (process.env.X_USER_WALLET_ADDRESS).toString();
const X_USER_SEED = (process.env.X_USER_SEED).toString();

let seqCount = 0;

const textToHex = (_o) => {
    return new Buffer.from(_o.text).toString('hex').toUpperCase();
}

const DOMAIN = "http://";
const NFTDOMAIN = textToHex({ text: DOMAIN });

const DOMAINVALUE = "xnft.peerkat.live   ";
const CURRENCY = textToHex({ text: DOMAINVALUE });

const X_url = 'wss://s.altnet.rippletest.net:51233';

const { XrplClient } = require('xrpl-client');

const xrpClient = new XrplClient(X_url);

const lib = require('xrpl-accountlib');


let txList = [{
    "TransactionType": "AccountSet",
    "Account": X_ISSUER_WALLET_ADDRESS,
    "SetFlag": 8,
    "Domain": NFTDOMAIN
}, {
    "TransactionType": "TrustSet",
    "Account": "rReceivingHotWallet...",
    "Flags": 131072,
    "LimitAmount": {
        "currency": CURRENCY,
        "issuer": X_ISSUER_WALLET_ADDRESS,
        "value": "1000000000000000e-96"
    }
},
{
    "TransactionType": "Payment",
    "Account": X_ISSUER_WALLET_ADDRESS,
    "Destination": "rReceivingHotWallet...",
    "Amount": {
        "currency": CURRENCY,
        "issuer": X_ISSUER_WALLET_ADDRESS,
        "value": "1000000000000000e-96"
    }
}, {
    "TransactionType": "SetRegularKey",
    "Account": X_ISSUER_WALLET_ADDRESS,
    "Fee": "12",
    "RegularKey": "rrrrrrrrrrrrrrrrrrrrBZbvji"
}, {
    "TransactionType": "AccountSet",
    "Account": X_ISSUER_WALLET_ADDRESS,
    "Fee": "12",
    "SetFlag": 4
}, {
    "TransactionType": "TrustSet",
    "Account": "rFriendToReceiveNFT...",
    "Flags": 131072,
    "LimitAmount": {
        "currency": CURRENCY,
        "issuer": X_ISSUER_WALLET_ADDRESS,
        "value": "1000000000000000e-96"
    }
}, {
    "TransactionType": "Payment",
    "Account": "rReceivingHotWallet...",
    "Destination": "rFriendToReceiveNFT...",
    "Amount": {
        "currency": CURRENCY,
        "issuer": X_ISSUER_WALLET_ADDRESS,
        "value": "1000000000000000e-96"
    }
}]


const _getaccountinfo = async (X_WALLET_ADDRESS) => {
    try {
        const resp = await xrpClient.send({ 'command': 'account_info', 'account': X_WALLET_ADDRESS, 'ledger': 'validated' });
        return resp;

    } catch (e) {
        return e;

    }

}

const _getfee = async () => {
    try {
        const resp = await xrpClient.send({ 'command': 'fee' });
        return resp;

    } catch (e) {
        return e;

    }

}

const _sendTx = async (_o) => {
    try {
        const resp = await xrpClient.send(_o);
        return resp;

    } catch (e) {
        return e;

    }

}

const _getAccountInfoAndFee = async (X_WALLET_ADDRESS) => {

    const x_acountinfo = await _getaccountinfo(X_WALLET_ADDRESS);
    const x_fee = await _getfee();
    const fee = (parseFloat(x_fee.drops.base_fee) * 1000000).toFixed(0) + "";

    x_acountinfo.account_data.Sequence += seqCount;

    return { accountInfo: x_acountinfo, feeInfo: x_fee, feeValue: fee }

}

const _signTx = async (_o) => {
    return lib.sign(_o.tx, _o.xaccount);

}

const _getXAccount = async (X_WALLET_SEED) => {
    return lib.derive.familySeed(X_WALLET_SEED);

}

const _requestRes = async (_xresp, res) => {

    if (_xresp.error) {
        return res.serverError(_xresp);
    } else {
        return res.ok(_xresp);
    }
}


const createTrustReceiverAndIssuer = async (_o) => {
    //Create trust-line brand wallet <-> issuer wallet

    const txInfo = await _getAccountInfoAndFee(_o.X_BRAND_WALLET_ADDRESS);

    txList[1].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[1].Fee = txInfo.feeValue;
    txList[1].Account = _o.X_BRAND_WALLET_ADDRESS;

    const xaccount = await _getXAccount(_o.X_BRAND_SEED);

    const txObj = await _signTx({ tx: txList[1], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}


const issueNFToken = async (_o) => {
    //Issue NFToken send to brand wallet

    const txInfo = await _getAccountInfoAndFee(_o.X_ISSUER_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_ISSUER_SEED);

    txList[2].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[2].Destination = _o.X_BRAND_WALLET_ADDRESS;
    txList[2].Fee = txInfo.feeValue;//fee;

    const txObj = await _signTx({ tx: txList[2], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}

const blackholeSetRegKey = async (_o) => {
    //Blackhole issuer wallet - set regular key

    const txInfo = await _getAccountInfoAndFee(_o.X_ISSUER_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_ISSUER_SEED);

    txList[3].Sequence = txInfo.accountInfo.account_data.Sequence;

    const txObj = await _signTx({ tx: txList[3], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}

const blackholeDisableMasterKey = async (_o) => {
    //Blackhole issuer wallet - disable master key

    const txInfo = await _getAccountInfoAndFee(_o.X_ISSUER_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_ISSUER_SEED);

    txList[4].Sequence = txInfo.accountInfo.account_data.Sequence;

    const txObj = await _signTx({ tx: txList[4], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}

const createTrustUserAndIssuer = async (_o) => {
    //Create trust-line user wallet <-> issuer wallet.

    const txInfo = await _getAccountInfoAndFee(_o.X_USER_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_USER_SEED);

    txList[5].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[5].Account = _o.X_USER_WALLET_ADDRESS;
    txList[5].Fee = txInfo.feeValue;

    const txObj = await _signTx({ tx: txList[5], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}


const sendNFTokenToUser = async (_o) => {
    //Sends NFToken to user wallet.

    const txInfo = await _getAccountInfoAndFee(_o.X_BRAND_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_BRAND_SEED);

    txList[6].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[6].Account = _o.X_BRAND_WALLET_ADDRESS;
    txList[6].Destination = _o.X_USER_WALLET_ADDRESS;
    txList[6].Fee = txInfo.feeValue;

    const txObj = await _signTx({ tx: txList[6], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}

const accountset = async (_o) => {
    //Account setup

    const txInfo = await _getAccountInfoAndFee(_o.X_ISSUER_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_ISSUER_SEED);

    txList[0].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[0].Fee = txInfo.feeValue;

    const txObj = await _signTx({ tx: txList[0], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}

module.exports = {

    create: async function (req, res) {

        const ans = await accountset({ X_ISSUER_WALLET_ADDRESS, X_ISSUER_SEED });

        return _requestRes(ans, res)


    },

    approve: async function (req, res) {

        const ans = await createTrustReceiverAndIssuer({ X_BRAND_SEED, X_BRAND_WALLET_ADDRESS });

        return _requestRes(ans, res)

    },

    issue: async function (req, res) {

        const arr = [];

        arr.push(await issueNFToken({ X_ISSUER_WALLET_ADDRESS, X_ISSUER_SEED, X_BRAND_WALLET_ADDRESS }));

        seqCount++;
        arr.push(await blackholeSetRegKey({ X_ISSUER_WALLET_ADDRESS, X_ISSUER_SEED }));

        seqCount++;
        arr.push(await blackholeDisableMasterKey({ X_ISSUER_WALLET_ADDRESS, X_ISSUER_SEED }));
        seqCount = 0;

        return res.ok(arr)

    },

    claim: async function (req, res) {

        const ans = await createTrustUserAndIssuer({ X_USER_WALLET_ADDRESS, X_USER_SEED, });

        return _requestRes(ans, res)

    },

    deliver: async function (req, res) {

        const ans = await sendNFTokenToUser({ X_BRAND_WALLET_ADDRESS, X_BRAND_SEED, X_USER_WALLET_ADDRESS });

        return _requestRes(ans, res)

    }



};

