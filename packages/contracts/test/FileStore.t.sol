// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.10 <0.9.0;

import "forge-std/Test.sol";
import {GasReporter} from "@latticexyz/gas-report/GasReporter.sol";
import {IContentStore} from "../src/IContentStore.sol";
import {ContentStore} from "../src/ContentStore.sol";
import {IFileStore} from "../src/IFileStore.sol";
import {FileStore} from "../src/FileStore.sol";
import {File, BytecodeSlice} from "../src/File.sol";

contract FileStoreTest is Test, GasReporter {
    IContentStore public contentStore;
    IFileStore public fileStore;

    // TODO: import/reference from IFileStore instead of duplicating
    event FileCreated(
        string indexed indexedFilename,
        address indexed pointer,
        string filename,
        uint256 size,
        bytes metadata
    );
    event FileDeleted(
        string indexed indexedFilename,
        address indexed pointer,
        string filename
    );

    function setUp() public {
        // TODO: set up deployer instead of using CREATE2_FACTORY
        contentStore = new ContentStore(
            0x4e59b44847b379578588920cA78FbF26c0B4956C
        );
        fileStore = new FileStore(contentStore);
    }

    function testCreateFile() public {
        string memory contents = vm.readFile("test/files/sstore2-max.txt");
        address pointer = fileStore.contentStore().addContent(bytes(contents));
        BytecodeSlice[] memory slices = new BytecodeSlice[](1);
        slices[0] = BytecodeSlice({
            pointer: pointer,
            size: uint32(bytes(contents).length),
            offset: 1
        });

        vm.expectEmit(true, false, true, true);
        emit FileCreated(
            "24kb.txt",
            address(0),
            "24kb.txt",
            24575,
            new bytes(0)
        );

        startGasReport("create 24kb file");
        (, File memory file) = fileStore.createFile("24kb.txt", slices);
        endGasReport();

        assertEq(file.size, 24575);
        assertEq(bytes(file.read()).length, 24575);
        assertEq(file.read(), contents);

        vm.expectRevert(
            abi.encodeWithSelector(
                IFileStore.FilenameExists.selector,
                "24kb.txt"
            )
        );
        fileStore.createFile("24kb.txt", slices);
    }

    function testCreateFileWithExtraData() public {
        bytes memory content = "hello world";
        address pointer = fileStore.contentStore().addContent(content);
        BytecodeSlice[] memory slices = new BytecodeSlice[](1);
        slices[0] = BytecodeSlice({
            pointer: pointer,
            size: uint32(content.length),
            offset: 1
        });

        vm.expectEmit(true, false, true, true);
        emit FileCreated(
            "hello.txt",
            address(0),
            "hello.txt",
            11,
            bytes("hello world")
        );

        fileStore.createFile("hello.txt", slices, bytes("hello world"));
        assertEq(fileStore.getFile("hello.txt").read(), "hello world");
    }

    function testDeleteFile() public {
        bytes memory content = "hello world";
        address pointer = fileStore.contentStore().addContent(content);
        BytecodeSlice[] memory slices = new BytecodeSlice[](1);
        slices[0] = BytecodeSlice({
            pointer: pointer,
            size: uint32(content.length),
            offset: 1
        });
        fileStore.createFile("hello.txt", slices);

        assertTrue(
            fileStore.fileExists("hello.txt"),
            "expected file hello.txt to exist"
        );
        assertEq(fileStore.getFile("hello.txt").read(), "hello world");

        vm.expectEmit(true, true, true, true);
        emit FileDeleted(
            "hello.txt",
            address(0xeF9b18c004694d2721C861E30322F9275DC02A31),
            "hello.txt"
        );

        fileStore.deleteFile("hello.txt");
        assertFalse(
            fileStore.fileExists("hello.txt"),
            "expected file hello.txt to no longer exist"
        );
    }

    function testBigFile() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IFileStore.FileNotFound.selector,
                "non-existent.txt"
            )
        );
        fileStore.getFile("non-existent.txt");

        bytes memory content = bytes(vm.readFile("test/files/sstore2-max.txt"));
        address pointer = fileStore.contentStore().addContent(content);

        BytecodeSlice[] memory slices = new BytecodeSlice[](4);
        slices[0] = BytecodeSlice({
            pointer: pointer,
            size: uint32(content.length),
            offset: 1
        });
        slices[1] = BytecodeSlice({
            pointer: pointer,
            size: uint32(content.length),
            offset: 1
        });
        slices[2] = BytecodeSlice({
            pointer: pointer,
            size: uint32(content.length),
            offset: 1
        });
        slices[3] = BytecodeSlice({
            pointer: pointer,
            size: uint32(content.length),
            offset: 1
        });

        startGasReport("create big file");
        fileStore.createFile("big.txt", slices);
        endGasReport();

        File memory file = fileStore.getFile("big.txt");
        startGasReport("read big file");
        file.read();
        endGasReport();

        assertEq(file.size, 98300);
        assertEq(bytes(file.read()).length, 98300);
    }

    function testSlices() public {
        address helloPointer = fileStore.contentStore().addContent(
            bytes(
                "The meaning of HELLO is an expression or gesture of greeting - used interjectionally in greeting, in answering the telephone, or to express surprise."
            )
        );
        address worldPointer = fileStore.contentStore().addContent(
            bytes(
                "The meaning of WORLD is the earthly state of human existence."
            )
        );
        BytecodeSlice[] memory slices = new BytecodeSlice[](3);
        slices[0] = BytecodeSlice({pointer: helloPointer, offset: 16, size: 5});
        slices[1] = BytecodeSlice({pointer: worldPointer, offset: 15, size: 6});
        slices[2] = BytecodeSlice({pointer: worldPointer, offset: 61, size: 1});

        startGasReport("create file");
        fileStore.createFile("hello.txt", slices);
        endGasReport();

        startGasReport("read file");
        string memory contents = fileStore.getFile("hello.txt").read();
        endGasReport();

        assertEq(contents, "HELLO WORLD.");
    }

    function testBytecode() public {
        BytecodeSlice[] memory slices = new BytecodeSlice[](1);
        slices[0] = BytecodeSlice({
            pointer: address(contentStore),
            offset: 0,
            size: 10
        });

        startGasReport("create file");
        fileStore.createFile("file.txt", slices);
        endGasReport();

        startGasReport("read file");
        string memory contents = fileStore.getFile("file.txt").read();
        endGasReport();

        assertEq(bytes(contents), hex"60806040523480156100");
    }

    function _getCode(address target) internal view returns (bytes memory) {
        uint256 codeSize;

        // Get the size of the code on target address
        assembly {
            codeSize := extcodesize(target)
        }

        bytes memory code = new bytes(codeSize);

        // Copy the code using extcodecopy
        assembly {
            // Note: add(code, 32) is used because the first 32 bytes of a 'bytes' array
            // is the length of the array.
            extcodecopy(target, add(code, 32), 0, codeSize)
        }

        return code;
    }
}
