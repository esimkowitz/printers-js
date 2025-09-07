# Use Ubuntu LTS as base for maximum compatibility
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies including CUPS for printer support
RUN apt-get update && apt-get install -y \
    # Core system tools
    curl \
    wget \
    git \
    build-essential \
    pkg-config \
    clang \
    ca-certificates \
    gnupg \
    software-properties-common \
    # CUPS and printer support
    cups \
    cups-client \
    cups-common \
    libcups2-dev \
    cups-pdf \
    avahi-daemon \
    avahi-utils \
    # Network tools for printer discovery
    net-tools \
    iputils-ping \
    dnsutils \
    # Development tools
    sudo \
    zsh \
    vim \
    nano \
    htop \
    tree \
    jq \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/*

# Create vscode user with sudo access
RUN useradd -m -s /bin/zsh vscode \
    && usermod -aG sudo vscode \
    && echo 'vscode ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh \
    && mv /root/.deno/bin/deno /usr/local/bin/deno \
    && chmod +x /usr/local/bin/deno

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash \
    && mv /root/.bun/bin/bun /usr/local/bin/bun \
    && chmod +x /usr/local/bin/bun

# Install nektos/act for local CI testing
RUN curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | bash \
    && mv ./bin/act /usr/local/bin/act

# Set up CUPS for container environment
RUN sed -i 's/Listen localhost:631/Listen 0.0.0.0:631/' /etc/cups/cupsd.conf \
    && sed -i 's/<Location \/>/<Location \/>\n  Allow from all/' /etc/cups/cupsd.conf \
    && sed -i 's/<Location \/admin>/<Location \/admin>\n  Allow from all/' /etc/cups/cupsd.conf

# Create workspace directory
RUN mkdir -p /workspaces/printers-js \
    && chown -R vscode:vscode /workspaces

# Switch to vscode user
USER vscode
WORKDIR /workspaces/printers-js

# Set up user environment
RUN echo 'export PATH="$HOME/.deno/bin:$HOME/.bun/bin:$HOME/.cargo/bin:$PATH"' >> ~/.zshrc \
    && echo 'export PRINTERS_JS_SIMULATE=true' >> ~/.zshrc

# Expose CUPS web interface port
EXPOSE 631
