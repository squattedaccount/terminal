import { web3Handler } from '../web3-handler.js';
import i18n from '../i18n/i18n.js';
import logger from '../core/logger.js';
import { createTerminalError, createTerminalMessage } from '../utils/messaging.js';
import helpCommand from './help.js';
import { Spinner } from '../core/spinner.js';

// The API endpoint for the verification bot
const API_ENDPOINT = 'https://verif-bot.sm-p.workers.dev/api';

async function startVerification(terminal, discordId) {
    terminal.display_output(createTerminalMessage('verify.connecting'));
    await web3Handler.connectWallet();
    const walletAddress = web3Handler.getConnectedAccount();
    if (!walletAddress) {
        terminal.display_output(createTerminalError('verify.connectionFailed'));
        return;
    }
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 10);
    const message = `Verify NFT ownership for Discord user ${discordId} at ${timestamp} nonce:${nonce}`;

    try {
        const web3 = web3Handler.getWeb3Instance();
        if (!web3) {
            throw new Error(i18n.t('web3.error.notConnected'));
        }
        
        terminal.display_output(createTerminalMessage('verify.signMessage'));
        const signature = await web3.eth.personal.sign(message, walletAddress, '');
        
        terminal.display_output(createTerminalMessage('verify.sending'));


        const response = await fetch(`${API_ENDPOINT}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                discord_user_id: discordId,
                wallet_address: walletAddress,
                signature: signature,
                message: message,
            }),
        });

        const result = await response.json();

        if (response.ok) {
            terminal.display_output(createTerminalMessage('verify.success', { message: result.message }));
        } else {
            terminal.display_output(createTerminalError('verify.failed', { error: result.error || 'Verification failed.' }));
        }
    } catch (error) {
        terminal.display_output(createTerminalError('web3.error.generic', { message: error.message }));
    }
}

async function checkStatus(terminal) {
    terminal.display_output(createTerminalMessage('verify.connecting'));
    await web3Handler.connectWallet();
    const walletAddress = web3Handler.getConnectedAccount();
    if (!walletAddress) {
        terminal.display_output(createTerminalError('verify.connectionFailed'));
        return;
    }

    try {
        terminal.display_output(createTerminalMessage('verify.checkingStatus'));
        const response = await fetch(`${API_ENDPOINT}/status/${walletAddress}`);
        const result = await response.json();

        if (response.ok) {
            if (result.isVerified) {
                terminal.display_output(createTerminalMessage('verify.statusVerified'));
                terminal.display_output(createTerminalMessage('verify.discordUser', { username: result.username, discordId: result.discordId }));
                terminal.display_output(createTerminalMessage('verify.walletAddress', { walletAddress: result.walletAddress }));
                terminal.display_output(createTerminalMessage('verify.verifiedOn', { timestamp: new Date(result.timestamp).toLocaleString() }));
            } else {
                terminal.display_output(createTerminalMessage('verify.statusNotVerified'));
                terminal.display_output(createTerminalMessage('verify.startProcess'));
            }
        } else {
            terminal.display_output(createTerminalError('verify.failed', { error: result.error || i18n.t('verify.statusCheckFailed') }));
        }
    } catch (error) {
        terminal.display_output(createTerminalError('web3.error.generic', { message: error.message }));
    }
}

function showHelp(terminal) {
    const helpLines = helpCommand._generateSpecificHelp('verify');
    // `helpLines` is already an array of formatted output objects, so we can
    // forward it directly to the terminal without additional wrapping.
    terminal.display_output(helpLines);
}

const command = {
    name: 'verify',
    description: 'Verify NFT ownership for Discord role.',
    handler: async (args, onMessage) => {
        // Adapt legacy verify implementation to the new command API (args, onMessage)
        // by creating a lightweight adapter that bridges the old `terminal.*` calls
        // to the new `onMessage` mechanism.
        const terminal = {
            display_output: onMessage,
            // No spinner for this command; we emit standard messages for consistency with other commands.
            showSpinner: () => {},
            hideSpinner: () => {},
            get_input: async () => {
                // This is a placeholder. The new API doesn't support interactive input in the same way.
                return '';
            },
        };

        const subcommand = args[0];

        if (!subcommand || subcommand === 'help') {
            showHelp(terminal);
            return;
        }

        if (subcommand === 'check') {
            await checkStatus(terminal);
            return;
        } else if (subcommand.match(/^\d{17,19}$/)) {
            await startVerification(terminal, subcommand);
            return;
        } else {
            terminal.display_output(createTerminalError('verify.invalidSubcommand'));
            showHelp(terminal);
            return;
        }
    },
    get help() {
        return {
            summary: i18n.t('help.verify.summary'),
            detailed: i18n.t('help.verify.detailed', { returnObjects: true }),
        };
    },
};

export default command;
