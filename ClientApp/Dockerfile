# Use a base image with node on it, since we need it to npm install our react stuff, and our static server.
FROM node:10

# Setup our working directory inside the image. This will be where we copy our application code to!
WORKDIR /usr/todo-app/

# Globally install 'serve' which we will use as a static server. We want to do this first, so that it does need
# get rebuilt when we make code changes or npm project-dependcy changes in our package-lock.json
RUN npm install -g serve

# Copy our package.json and package-lock.json into the working directory.
# The reason we are not copying all of our code yet is so that we can npm install BEFORE we copy our application
# code into the image. That way, when we make code changes, we won't have to re-install our npm packaged when the
# container rebuilds. Remember, each Dockerfile step creates a new cached image from which to rebuild from, which
# is why this ordering works!
COPY ./package*.json ./

# install npm dependencies. Since we didn't copy our package files into ./ClientApp, but rather, the working dir
# directly, we just run the command in the working dir.
RUN npm install

# Now that npm has installed our packages, lets copy our application code into the image
# NOTE: We have specified files to ignore in the .dockerignore file, e.g. node_modules.
COPY ./ ./

# NOTE: we could run leave this here, as a 'development' container, by setting CMD to do npm start (Running the react development server)
# But instead, for this we want to run a statically served build, so we are going to execute react-script to build into a servable, static asset.
RUN npm run build

# Inform docker that this image listens on port 3000 when run as a container. This will be what we specify our react app to be served from.
# In the 'primary process' using the CMD instruction.
EXPOSE 3000

# Set our images 'primary process' to serve the constructed react application using the 'serve' node application we installed 
# into our image at the beginning. We are telling it to listen on port 3000
CMD ["serve", "-s", "build", "-l", "3000"]