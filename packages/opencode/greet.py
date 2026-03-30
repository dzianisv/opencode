#!/usr/bin/env python3
import sys


def main():
    # If a name is provided as the first positional argument, use it;
    # otherwise default to "World".
    name = sys.argv[1] if len(sys.argv) > 1 else "World"
    print(f"Hello, {name}!")


if __name__ == "__main__":
    main()
