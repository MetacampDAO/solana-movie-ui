import { FC } from 'react'
import { Movie } from '../models/Movie'
import { useState } from 'react'
import { Box, Button, FormControl, FormLabel, Input, NumberDecrementStepper, NumberIncrementStepper, NumberInput, NumberInputField, NumberInputStepper, Textarea } from '@chakra-ui/react'
import * as web3 from '@solana/web3.js'
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react'
import { SolanaMovieProgram } from '../data/solana_movie_program'
import * as smpIdl from '../data/solana_movie_program.json';
import * as anchor from "@project-serum/anchor";

const MOVIE_REVIEW_PROGRAM_ID = '2SogeA4hASCYGTSQqoSqKy8cZ3bnka5N5U9Ewkswkyf5'

export const Form: FC = () => {
    const [title, setTitle] = useState('')
    const [rating, setRating] = useState(0)
    const [description, setDescription] = useState('')

    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const handleSubmit = (event: any) => {
        event.preventDefault()
        const movie = new Movie(title, rating, description)
        handleTransactionSubmit(movie)
    }

    const handleTransactionSubmit = async (movie: Movie) => {
        if (!wallet?.publicKey) {
            alert('Please connect your wallet!')
            return
        }

        const smpClient = new anchor.Program<SolanaMovieProgram>(
            smpIdl as any,
            new web3.PublicKey(MOVIE_REVIEW_PROGRAM_ID),
            new anchor.AnchorProvider(
                connection,
                wallet,
                anchor.AnchorProvider.defaultOptions()
            )
        ) 

        const [pda] = await web3.PublicKey.findProgramAddress(
            [
                wallet.publicKey.toBuffer(), 
                Buffer.from(anchor.utils.bytes.utf8.encode(movie.title))
            ],
            new web3.PublicKey(MOVIE_REVIEW_PROGRAM_ID)
        )
        const variant = await connection.getAccountInfo(pda)? 1: 0;

        try {
            const txSig = await smpClient.methods.addOrUpdateReview(
                variant,
                movie.title,
                movie.rating,
                movie.description
            ).accounts({
                initializer: wallet.publicKey,
                pdaAccount: pda,
                systemProgram: web3.SystemProgram.programId
            }).rpc();
            alert(`Transaction submitted: https://solana.fm/tx/${txSig}?cluster=devnet-solana`)
            console.log(`Transaction submitted: https://solana.fm/tx/${txSig}?cluster=devnet-solana`)
        } catch (e) {
            console.log(JSON.stringify(e))
            alert(JSON.stringify(e))
        }
    }

    return (
        <Box
            p={4}
            display={{ md: "flex" }}
            maxWidth="32rem"
            borderWidth={1}
            margin={2}
            justifyContent="center"
        >
            <form onSubmit={handleSubmit}>
                <FormControl isRequired>
                    <FormLabel color='gray.200'>
                        Movie Title
                    </FormLabel>
                    <Input
                        id='title'
                        color='gray.400'
                        onChange={event => setTitle(event.currentTarget.value)}
                    />
                </FormControl>
                <FormControl isRequired>
                    <FormLabel color='gray.200'>
                        Add your review
                    </FormLabel>
                    <Textarea
                        id='review'
                        color='gray.400'
                        onChange={event => setDescription(event.currentTarget.value)}
                    />
                </FormControl>
                <FormControl isRequired>
                    <FormLabel color='gray.200'>
                        Rating
                    </FormLabel>
                    <NumberInput
                        max={5}
                        min={1}
                        onChange={(valueString) => setRating(parseInt(valueString))}
                    >
                        <NumberInputField id='amount' color='gray.400' />
                        <NumberInputStepper color='gray.400'>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                        </NumberInputStepper>
                    </NumberInput>
                </FormControl>
                <Button width="full" mt={4} type="submit">
                    Submit Review
                </Button>
            </form>
        </Box>
    );
}