const ethers = require('ethers'); 
const iface = new ethers.utils.Interface(['function initiateDeprecation()']); 
console.log('Selector:', iface.getSighash('initiateDeprecation'));