module.exports = {
    static: async () => {
        if (!isLocalDb()) return

        await Role_Type.destroy({})
        await NFT_Status_Options.destroy({})
        await Collection_Status_Options.destroy({})
    },
    nonStatic: async () => {

        if (!isLocalDb()) return

        await NFT_Form.destroy({})
        // await NFT_Claim_Verification.destroy({})
        await NFT_Form_Status.destroy({})
        await NFT_Currency.destroy({})
        await Xrpl_Transactions.destroy({})
        await Xumm.destroy({})
        await Xumm_Responses.destroy({})
        // await Collection.destroy({})
        // await User.destroy({})
        // await Email.destroy({})
        await Wallet.destroy({})
        // await Role.destroy({})
    }
}

const isLocalDb = () => {
    const { DB_URI } = process.env
    conditions = [
        'localhost',
        '127.0.0.1'
    ]

    if (conditions.some(condition => DB_URI.includes(condition))) return true

    sails.log.error(`Working DB is not test-db. Deleting records is only allowed on test-db`);
    return false;
};