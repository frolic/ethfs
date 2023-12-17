import Link from "next/link";

import { FileExplorer } from "../file-explorer/FileExplorer";
import { DocumentArrowUpIcon } from "../icons/DocumentArrowUpIcon";
import { GithubIcon } from "../icons/GithubIcon";
import { TwitterIcon } from "../icons/TwitterIcon";

export default async function HomePage() {
  return (
    <div className="w-screen min-h-screen bg-lime-200 text-lg leading-none relative overflow-hidden">
      <div className="absolute inset-0 text-[12rem] font-black text-lime-400 pointer-events-none select-none">
        Ethereum
        <br />
        File
        <br />
        System
      </div>
      <div className="absolute inset-0 flex flex-col items-end justify-end">
        <div className="flex flex-col p-8 gap-8">
          <Link
            href="/bounties"
            className="text-lime-500 hover:text-lime-600 flex flex-col items-center justify-center p-2 gap-2 border-2 border-transparent border-dotted outline-none focus:border-current"
          >
            <span className="text-5xl">
              <DocumentArrowUpIcon />
            </span>
            File Bounties
          </Link>
          <a
            href="https://twitter.com/frolic"
            target="_blank"
            rel="noopener noreferer noreferrer"
            className="text-lime-500 hover:text-lime-600 flex flex-col items-center justify-center p-2 gap-2 border-2 border-transparent border-dotted outline-none focus:border-current"
          >
            <span className="text-5xl">
              <TwitterIcon />
            </span>
            Say hello &rarr;
          </a>
          <a
            href="https://github.com/holic/ethfs"
            target="_blank"
            rel="noopener noreferer noreferrer"
            className="text-lime-500 hover:text-lime-600 flex flex-col items-center justify-center p-2 gap-2 border-2 border-transparent border-dotted outline-none focus:border-current"
          >
            <span className="text-5xl">
              <GithubIcon />
            </span>
            View source &rarr;
          </a>
        </div>
      </div>
      <div className="h-full relative flex flex-col">
        <div className="self-end p-2">{/* <ConnectButton /> */}</div>
        {/* <FileUploader /> */}
        <FileExplorer />
      </div>
    </div>
  );
}
