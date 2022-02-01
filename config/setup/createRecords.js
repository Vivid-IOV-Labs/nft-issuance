const nftStatusOptions = async () => {
    /*
        Create Status_Options records
    */

    const statusOptions = [
        {
            name: 'created',
            order: 1
        },
        {
            name: 'approved',
            order: 2
        },
        {
            name: 'rejected',
            order: 3
        },
        {
            name: 'issued',
            order: 4
        },
        {
            name: 'claiming',
            order: 5
        },
        {
            name: 'delivered',
            order: 6
        },
    ]

    const nftStatusOptionsAdded = await Promise.all(statusOptions.map(statusOption => NFT_Status_Options.findOrCreate(
        { name: statusOption.name },
        { name: statusOption.name, order: statusOption.order }
    )))
    if (!nftStatusOptionsAdded) sails.log.error("Could not populate NFT_Status_Options")
}

module.exports = {
    static: async () => {
        await nftStatusOptions()
    }
}