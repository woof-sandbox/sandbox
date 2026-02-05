set dotenv-load := true

default:
    @just --choose

verify-comet-vNetSepolia address:
    forge verify-contract {{address}} \
    SandboxComet \
    --rpc-url $TENDERLY_VIRTUAL_TESTNET_RPC \
    --etherscan-api-key $TENDERLY_ACCESS_KEY \
    --verifier custom \
    --verifier-url $TENDERLY_VERIFIER_URL \
    --watch

