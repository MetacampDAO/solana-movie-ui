import bs58 from 'bs58'
import * as web3 from '@solana/web3.js'
import { SolanaMovieProgram } from '../data/solana_movie_program'
import * as smpIdl from '../data/solana_movie_program.json';
import * as anchor from "@project-serum/anchor";
import { Movie } from '../models/Movie'
import { NodeWallet } from '@metaplex/js';

const MOVIE_REVIEW_PROGRAM_ID = '2SogeA4hASCYGTSQqoSqKy8cZ3bnka5N5U9Ewkswkyf5'

export class MovieCoordinator {
    static accounts: web3.PublicKey[] = []

    static async prefetchAccounts(connection: web3.Connection, search: string) {
        const fauxWallet = new NodeWallet(anchor.web3.Keypair.generate())

        const smpClient = new anchor.Program<SolanaMovieProgram>(
            smpIdl as any,
            new web3.PublicKey(MOVIE_REVIEW_PROGRAM_ID),
            new anchor.AnchorProvider(
                connection,
                fauxWallet as any,
                anchor.AnchorProvider.defaultOptions()
            )
        ) 
        const accounts = await smpClient.account.movieAccountState.all(
            search === '' ? [] : [
                { 
                    memcmp: 
                        { 
                            offset: 1 + 1 + 4 + 8, // bool + u8 + str endpt + discriminator
                            bytes: bs58.encode(Buffer.from(search))
                        }
                }
            ] 
        )

        this.accounts = accounts.sort((row) => row.account.rating).map(account => account.publicKey)
    }

    static async fetchPage(connection: web3.Connection, page: number, perPage: number, search: string, reload: boolean = false): Promise<Movie[]> {
        const fauxWallet = new NodeWallet(anchor.web3.Keypair.generate())

        const smpClient = new anchor.Program<SolanaMovieProgram>(
            smpIdl as any,
            new web3.PublicKey(MOVIE_REVIEW_PROGRAM_ID),
            new anchor.AnchorProvider(
                connection,
                fauxWallet as any,
                anchor.AnchorProvider.defaultOptions()
            )
        )

        if (this.accounts.length === 0 || reload) {
            await this.prefetchAccounts(connection, search)
        }

        const paginatedPublicKeys = this.accounts.slice(
            (page - 1) * perPage,
            page * perPage,
        )

        if (paginatedPublicKeys.length === 0) {
            return []
        }

        const accounts = await smpClient.account.movieAccountState.fetchMultiple(paginatedPublicKeys);
        return accounts.map(account => {
            const anyAccount = account as any;
            return new Movie(
                anyAccount.title,
                anyAccount.rating, 
                anyAccount.description
            )
        })
    }
}