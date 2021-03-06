module.exports.custom = {

    mongodbDatabase: {
        uri: process.env.DB_URI
    },
    node: {
        environment: process.env.NODE_ENV
    },
    xrplWallet: {
        issuer: {
            address: process.env.X_ISSUER_WALLET_ADDRESS,
            seed: process.env.X_ISSUER_SEED
        },
        brand: {
            address: process.env.X_BRAND_WALLET_ADDRESS,
            seed: process.env.X_BRAND_SEED
        }
    }

}
