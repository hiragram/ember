import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Press_Start_2P } from 'next/font/google';

const pressStart2P = Press_Start_2P({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
});

export const Header = () => {
  return (
    <header className="sticky top-0 bg-gray-800/80 backdrop-blur-md shadow-sm z-10 border-b border-gray-700">
      <div className="container mx-auto px-4 py-3 max-w-[1200px] flex justify-between items-center">
        <Link href="/" className="flex items-center group">
          <span className="text-3xl mr-2 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300">🔥</span>
          <h1 className={`${pressStart2P.className} text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-red-600 dark:from-amber-400 dark:to-red-500 group-hover:scale-105 transition-all duration-300`}>
            EMBER
          </h1>
        </Link>
      </div>
    </header>
  );
};