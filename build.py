import PyInstaller.__main__
import sys
import os

# Define build configuration
args = [
    'run_desktop.py',                  # Entrypoint script
    '--name=GitCoreManager',            # Name of the output .exe
    '--onefile',                       # Create a single executable file
    '--noconsole',                     # Do not open a console window
    '--clean',                         # Clean PyInstaller cache before build
    '--add-data=dist;dist',            # Bundle the build directory 'dist'

    # Hidden imports for Uvicorn and FastAPI dependencies
    '--hidden-import=uvicorn.loops',
    '--hidden-import=uvicorn.loops.auto',
    '--hidden-import=uvicorn.loops.asyncio',
    '--hidden-import=uvicorn.protocols',
    '--hidden-import=uvicorn.protocols.http',
    '--hidden-import=uvicorn.protocols.http.auto',
    '--hidden-import=uvicorn.protocols.http.h11_impl',
    '--hidden-import=uvicorn.protocols.websockets',
    '--hidden-import=uvicorn.protocols.websockets.auto',
    '--hidden-import=uvicorn.lifespan',
    '--hidden-import=uvicorn.lifespan.on',
    '--hidden-import=uvicorn.lifespan.off',
    '--hidden-import=uvicorn.lifespan.auto',
    
    # asyncio loop dependencies
    '--hidden-import=anyio._backends._asyncio',
]

if __name__ == '__main__':
    print("--------------------------------------------------")
    print("Building GitCoreManager.exe via PyInstaller...")
    print("This might take a couple of minutes. Please wait...")
    print("--------------------------------------------------")
    
    PyInstaller.__main__.run(args)
    
    print("\n--------------------------------------------------")
    print("Build finished! Executable is located in the 'dist' folder.")
    print("--------------------------------------------------")
