#!/usr/bin/env perl

use strict;
use warnings;
use File::Slurp qw(slurp write_file);
use File::Basename qw(basename dirname);
use FindBin;
use Cwd qw(cwd);

sub process_js {
    my $cwd  = cwd();
    my $path = shift;
    my $file = basename($path);
    chdir( dirname $path);

    my @lines = split /\n/, slurp($file);
    my @out;
    while (@lines) {
        my $line = shift @lines;
        if ( $line =~ m/^\s*require\(['"]([^'"]+)['"]\)/ ) {
            push @out, process_js($1);
        }
        else {
            push @out, $line;
        }
    }
    chdir $cwd;
    return @out;
}

my $home_dir = "$FindBin::RealBin";
chdir($home_dir);
write_file( '_site/js/main.js', join "\n", process_js 'src/Init.js' );

