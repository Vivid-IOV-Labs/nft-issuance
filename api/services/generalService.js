const objectToDotNotation = (args) => {
    /*
        Consume update args object for document and can handle one level nesting.
        Returns object for leverage by $set in Mongoose update function.
    */
    const setObject = {};
    Object.keys(args).forEach((key) => {
        if (typeof args[key] === 'object') {
            Object.keys(args[key]).forEach((subkey) => {
                setObject[`${key}.${subkey}`] = args[key][subkey];
            });
        } else {
            setObject[key] = args[key];
        }
    });
    return setObject;
};

const populateNFTFormStatus = () => async nft => {
    /* 
        Deep/nested populate for status - NFT_Form_Status
  
        nft is an Array of Objects
    */

    if (!Array.isArray(nft)) nft = [nft]

    await Promise.all(nft.map(async nftRecord => {
        await Promise.all(nftRecord.status.map(async statusRecord => {
            let statusOptionsId = statusRecord.status
            let nftStatusOptions = await sails.models.nft_status_options.findOne(statusOptionsId)
            let statusName = nftStatusOptions.name
            statusRecord.status = statusName
            return statusRecord
        }))
    }))
    return nft
}

module.exports = {
    objectToDotNotation,
    populateNFTFormStatus
}
