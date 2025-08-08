import subprocess
import os
import sys
import http.server
import socketserver
import mimetypes

# Add modern MIME types for ES Modules, JSON, and audio files
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('audio/ogg', '.ogg')
mimetypes.add_type('audio/ogg; codecs=opus', '.opus')
mimetypes.add_type('audio/mpeg', '.mp3')


def run_development_server():
    """
    Starts the Parcel development server by running 'npm start'.
    This script provides a simple way to launch the project without needing to
    manually run npm commands in a terminal.
    """
    try:
        project_dir = os.path.dirname(os.path.abspath(__file__))
        print(f"Found project directory: {project_dir}")
        print("\nStarting the development server with 'npm start'...")
        print("The server will be available at http://localhost:1234")
        print("You can stop the server by pressing Ctrl+C in the console.")
        print("-" * 50)

        # Execute the 'npm start' command
        # Using shell=True is often necessary on Windows to find 'npm.cmd'
        # and is generally safe for this specific, hardcoded command.
        process = subprocess.Popen(
            "npm start",
            shell=True,
            cwd=project_dir,
            stdout=sys.stdout,
            stderr=sys.stderr
        )

        # Wait for the process to complete (which it won't until Ctrl+C)
        process.wait()

    except FileNotFoundError:
        print("\n[ERROR] 'npm' command not found.")
        print("Please ensure Node.js and npm are installed and accessible in your system's PATH.")
    except KeyboardInterrupt:
        print("\n\nServer stopped by user. Goodbye!")
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")

if __name__ == "__main__":
    run_development_server()
