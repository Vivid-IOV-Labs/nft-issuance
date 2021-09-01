# NFToken Issue Service Demo

a [Sails v1](https://sailsjs.com) application


### Description

Issue Non Fungible Tokens (NFT) on the XRPL as proposed by the [XLS-14d](https://github.com/XRPLF/XRPL-Standards/discussions/30) standard.


### Setup

Create a ".env" file similar to the one shown by the file called ".env.example". Generate credentials for each wallet on the XRPL Tesnet using the following link: [XRP Testnet Faucet](https://xrpl.org/xrp-testnet-faucet.html).


### Routes

POST /create

POST /approve

POST /issue

POST /claim

POST /deliver


### Outcomes

Monitor updates via XRPL Testnet Block Explorer [Bithomp](https://test.bithomp.com).


### Links

+ [Sails framework documentation](https://sailsjs.com/get-started)
+ [Version notes / upgrading](https://sailsjs.com/documentation/upgrading)
+ [Community support options](https://sailsjs.com/support)


### Version info

This app was originally generated on Tue Jun 08 2021 05:30:33 GMT+0100 (British Summer Time) using Sails v1.2.4.

<!-- Internally, Sails used [`sails-generate@1.17.2`](https://github.com/balderdashy/sails-generate/tree/v1.17.2/lib/core-generators/new). -->



<!--
Note:  Generators are usually run using the globally-installed `sails` CLI (command-line interface).  This CLI version is _environment-specific_ rather than app-specific, thus over time, as a project's dependencies are upgraded or the project is worked on by different developers on different computers using different versions of Node.js, the Sails dependency in its package.json file may differ from the globally-installed Sails CLI release it was originally generated with.  (Be sure to always check out the relevant [upgrading guides](https://sailsjs.com/upgrading) before upgrading the version of Sails used by your app.  If you're stuck, [get help here](https://sailsjs.com/support).)
-->

