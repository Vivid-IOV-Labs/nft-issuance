require('dotenv').config();

//Generate Wallets
const X_ISSUER_WALLET_ADDRESS = (process.env.X_ISSUER_WALLET_ADDRESS).toString();
const X_ISSUER_SEED = (process.env.X_ISSUER_SEED).toString();

const X_BRAND_WALLET_ADDRESS = (process.env.X_BRAND_WALLET_ADDRESS).toString();
const X_BRAND_SEED = (process.env.X_BRAND_SEED).toString();

let seqCount = 0;

const _textToHex = (_o) => {
    return new Buffer.from(_o.text).toString('hex').toUpperCase();
}


const X_url = 'wss://s.altnet.rippletest.net:51233';

const { XrplClient } = require('xrpl-client');

const xrpClient = new XrplClient(X_url);

const lib = require('xrpl-accountlib');


let txList = [{
    "TransactionType": "AccountSet",
    "Account": X_ISSUER_WALLET_ADDRESS,
    "SetFlag": 8,
    "Domain": "NFT_DOMAIN"
}, {
    "TransactionType": "TrustSet",
    "Account": "rReceivingHotWallet...",
    "Flags": 131072,
    "LimitAmount": {
        "currency": "CURRENCY",
        "issuer": X_ISSUER_WALLET_ADDRESS,
        "value": "1000000000000000e-96"
    }
},
{
    "TransactionType": "Payment",
    "Account": X_ISSUER_WALLET_ADDRESS,
    "Destination": "rReceivingHotWallet...",
    "Amount": {
        "currency": "CURRENCY",
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
    //"Account": "rFriendToReceiveNFT...",
    "Flags": 131072,
    "LimitAmount": {
        "currency": "CURRENCY",
        "issuer": X_ISSUER_WALLET_ADDRESS,
        "value": "1000000000000000e-96"
    }
}, {
    "TransactionType": "Payment",
    "Account": "rReceivingHotWallet...",
    "Destination": "rFriendToReceiveNFT...",
    "Amount": {
        "currency": "CURRENCY",
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


const createTrustReceiverAndIssuer = async (_o) => {
    //Create trust-line brand wallet <-> issuer wallet

    const txInfo = await _getAccountInfoAndFee(_o.X_BRAND_WALLET_ADDRESS);

    txList[1].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[1].Fee = txInfo.feeValue;
    txList[1].Account = _o.X_BRAND_WALLET_ADDRESS;
    txList[1].LimitAmount.currency = _o.currency;

    const xaccount = await _getXAccount(_o.X_BRAND_SEED);

    const txObj = await _signTx({ tx: txList[1], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}


const issueNFToken = async (_o, _p) => {
    //Issue NFToken send to brand wallet

    const txInfo = await _getAccountInfoAndFee(_o.X_ISSUER_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_ISSUER_SEED);

    txList[2].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[2].Destination = _p.X_BRAND_WALLET_ADDRESS;
    txList[2].Fee = txInfo.feeValue;//fee;
    txList[2].Amount.currency = _o.currency;

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
    txList[6].Amount.currency = _o.currency;
    
    const txObj = await _signTx({ tx: txList[6], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}

const accountSet = async (_o) => {
    //Account setup
    const DOMAIN = `${_o.domain_protocol}://`;
    const NFTDOMAIN = _textToHex({ text: DOMAIN });
    
    const txInfo = await _getAccountInfoAndFee(_o.X_ISSUER_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_ISSUER_SEED);

    txList[0].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[0].Fee = txInfo.feeValue;
    txList[0].Domain = NFTDOMAIN;

    const txObj = await _signTx({ tx: txList[0], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}

const issueAndBlackhole = async (_o, _p) => {

    const arr = [];

    arr.push(await issueNFToken(_o, _p));

    seqCount++;
    arr.push(await blackholeSetRegKey(_o));

    seqCount++;
    arr.push(await blackholeDisableMasterKey(_o));
    seqCount = 0;

    return arr;

}

module.exports = {
    create: async (_o) => {
        //Done by a brand worker

        const accountSetResponse = await accountSet(_o);

        return accountSetResponse;
    },

    approve: async (_o) => {
        //Done by a brand manager

        const createdTrustReceiverAndIssuer = await createTrustReceiverAndIssuer(_o);

        return createdTrustReceiverAndIssuer;
    },

    issue: async (_o, _p) => {
        //Done by a peerkat admin worker
        const issueAndBlackholeResponse = await issueAndBlackhole(_o, _p)

        return issueAndBlackholeResponse;
    },

    claim: async (_o) => {
        //Done by a public user (via xumm app)

        const createdTrustUserAndIssuer = await createTrustUserAndIssuer(_o);

        return createdTrustUserAndIssuer;
    },

    deliver: async (_o) => {
        //Done by an peerkat admin user or done automatically 

        const sendNFTokenToUserResponse = await sendNFTokenToUser(_o);

        return sendNFTokenToUserResponse;
    },

    txTrustSet: async (_o) => {
        txList[5].LimitAmount.currency = _o.currency;

        return txList[5]
    },

    textToHex: async (_o) => {
        return _textToHex(_o)
    },
    
    generateCurrencyCode: async(_o) => {
        let domainValue = _o.tokenName.padEnd(20, ' ');
    
        // let currency = '02' + _textToHex({ text: domainValue });
        let currency = _textToHex({ text: domainValue });

        return currency
    }
}