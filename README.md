# XRPL NFT Issuance Service


### Description

Issue Non-Fungible Tokens (NFT) on the XRPL as proposed by the [XLS-14d](https://github.com/XRPLF/XRPL-Standards/discussions/30) standard. Distribute the issued NFTs via the [Xumm](https://xumm.readme.io/docs/introduction) Platform. 


### Setup

Create a ".env" file similar to the one shown by the file called ".env.example". Generate credentials for each wallet on the XRPL Testnet using the following link: [XRP Testnet Faucet](https://xrpl.org/xrp-testnet-faucet.html).


### Usage

It is recommended to use this web service in conjunction with the accompanying frontend, which can be located here : [nft-issuance](https://github.com/Vivid-IOV-Labs/nft-issuance-frontend).

At present a User would need to regenerate XRPL wallet credentials and add them to the ".env" file when creating new NFTs. This project is still on-going and we plan to add improvements to this repository.

It is recommended to run a local MongoDB database when using this application locally. Information on how to install MongoDB can be found here : [Install MongoDB](https://docs.mongodb.com/guides/server/install/).

It is also recommended to add "Xumm xApp" API credentials to the ".env" file, when using this application. More information about "Xumm xApp" can be found here : [What are xApps](https://xumm.readme.io/docs/what-are-xapps).

Use command ```npm run start:dev``` when working with this application locally. 


### Main Route Examples

POST /nft

    Body
        {
            "token_name": String,
            "title": String,
            "domain_protocol": String
        }


POST /nft/approve

    Body
        {
            "id": String //(Local Database ID)
        }


POST /nft/issue

    Body
        {
            "id": String //(Local Database ID)
        }


POST /nft/claim

    Body
        {
            "id": String //(Local Database ID)
        }


### Outcomes

Monitor updates via XRPL Testnet Block Explorer [Bithomp](https://test.bithomp.com).


### Links

+ [Sails framework documentation](https://sailsjs.com/get-started)
+ [Version notes / upgrading](https://sailsjs.com/documentation/upgrading)
+ [Community support options](https://sailsjs.com/support)
